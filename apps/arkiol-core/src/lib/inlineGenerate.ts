// src/lib/inlineGenerate.ts
// ─────────────────────────────────────────────────────────────────────────────
// Inline generation — runs the AI pipeline WITHIN the API request.
//
// WHY: Arkiol's generation architecture is queue-based (BullMQ Worker).
// The worker runs as a separate long-lived process on Railway/Fly/EC2.
// On Vercel-only deployments, there IS NO worker process — jobs sit in the
// queue forever. This module runs the same pipeline inline so generation
// works without an external worker.
//
// SCOPE: Handles single-format, single-variation requests within the Vercel
// function timeout (30-60s). Multi-format/variation requests would need a
// worker or Vercel Pro (300s timeout).
// ─────────────────────────────────────────────────────────────────────────────
import "server-only";
import { prisma } from "./prisma";
import { detectCapabilities } from "@arkiol/shared";

// ── Types ────────────────────────────────────────────────────────────────────
export interface InlineGenerateParams {
  jobId: string;
  userId: string;
  orgId: string;
  prompt: string;
  formats: string[];
  stylePreset: string;
  variations: number;
  brandId?: string | null;
  campaignId?: string | null;
  includeGif: boolean;
  locale: string;
  archetypeOverride?: { archetypeId: string; presetId: string };
  expectedCreditCost: number;
}

// ── Main inline processor ────────────────────────────────────────────────────
export async function runInlineGeneration(params: InlineGenerateParams): Promise<void> {
  const {
    jobId, userId, orgId, prompt, formats, stylePreset,
    variations, brandId, campaignId, locale, archetypeOverride,
  } = params;

  try {
    // Mark job as RUNNING
    await prisma.job.update({
      where: { id: jobId },
      data: { status: "RUNNING" as any, startedAt: new Date(), attempts: { increment: 1 } },
    }).catch(() => {});

    // ── Load brand if specified ────────────────────────────────────────────
    const brand = brandId
      ? await prisma.brand.findUnique({ where: { id: brandId } }).catch(() => null)
      : null;

    // ── Brief analysis (OpenAI call ~2-5s) ────────────────────────────────
    const { analyzeBrief } = require("../engines/ai/brief-analyzer");
    const brief = await analyzeBrief({
      prompt,
      stylePreset,
      format: formats[0],
      locale: locale ?? "en",
      brand: brand ? {
        primaryColor: brand.primaryColor,
        secondaryColor: brand.secondaryColor,
        voiceAttribs: brand.voiceAttribs as Record<string, number>,
        fontDisplay: brand.fontDisplay,
      } : undefined,
    });

    // Update progress
    await prisma.job.update({
      where: { id: jobId },
      data: { progress: 15 },
    }).catch(() => {});

    // ── Run pipeline for first format × first variation ───────────────────
    // On Vercel serverless, we process one asset at a time to stay within
    // the function timeout. The worker handles multi-asset parallelism.
    const format = formats[0];
    const { runGenerationPipeline } = require("../engines/ai/pipeline-orchestrator");

    const orchestratorInput = {
      jobId,
      orgId,
      campaignId: campaignId ?? jobId,
      format,
      variationIdx: 0,
      stylePreset,
      archetypeOverride: archetypeOverride as any,
      outputFormat: "png",
      pngScale: 1,
      brief,
      brand: brand ? {
        primaryColor: brand.primaryColor,
        secondaryColor: brand.secondaryColor,
        fontDisplay: brand.fontDisplay,
        fontBody: brand.fontBody,
        voiceAttribs: brand.voiceAttribs as Record<string, number>,
        colors: [brand.primaryColor, brand.secondaryColor],
        fonts: brand.fontDisplay ? [{ family: brand.fontDisplay }] : [],
        tone: brand.voiceAttribs ? Object.keys(brand.voiceAttribs as object) : [],
      } : undefined,
      requestedVariations: variations,
      maxAllowedVariations: variations,
    };

    // Update progress — entering render stage
    await prisma.job.update({
      where: { id: jobId },
      data: { progress: 30 },
    }).catch(() => {});

    const orchestrated = await runGenerationPipeline(orchestratorInput);
    const result = orchestrated.render;
    const assetId = result.assetId;

    // Update progress — render complete
    await prisma.job.update({
      where: { id: jobId },
      data: { progress: 70 },
    }).catch(() => {});

    // ── Upload to S3 if storage is configured ─────────────────────────────
    let s3Key: string | null = null;
    let svgKey: string | null = null;

    if (detectCapabilities().storage) {
      try {
        const { uploadToS3, buildS3Key } = require("./s3");
        s3Key = buildS3Key(orgId, assetId, "png");
        svgKey = buildS3Key(orgId, assetId, "svg");
        await Promise.all([
          uploadToS3(s3Key, result.buffer, "image/png"),
          uploadToS3(svgKey, Buffer.from(result.svgSource, "utf-8"), "image/svg+xml"),
        ]);
      } catch (s3Err: any) {
        console.warn("[inline-generate] S3 upload failed, storing SVG inline:", s3Err.message);
        s3Key = null;
        svgKey = null;
      }
    }

    // ── Create asset record ───────────────────────────────────────────────
    const { getCreditCost, getCategoryLabel } = require("./types");
    const creditCost = getCreditCost(format, false);

    const asset = await prisma.asset.create({
      data: {
        id: assetId,
        userId,
        orgId,
        campaignId: campaignId ?? null,
        name: `${format}-v1`,
        format,
        category: getCategoryLabel(format),
        mimeType: "image/png",
        s3Key: s3Key ?? `inline:${assetId}`,
        s3Bucket: process.env.S3_BUCKET_NAME ?? "inline",
        width: result.width,
        height: result.height,
        fileSize: result.fileSize,
        layoutFamily: result.layoutFamily,
        svgSource: result.svgSource,
        brandScore: result.brandScore,
        hierarchyValid: result.hierarchyValid,
        metadata: {
          layoutVariation: result.layoutVariation,
          violations: result.violations?.slice(0, 10) ?? [],
          svgKey: svgKey ?? null,
          durationMs: result.durationMs,
          pipelineMs: orchestrated.totalPipelineMs,
          anyFallback: orchestrated.anyFallback,
          allStagesPassed: orchestrated.allStagesPassed,
          inlineGenerated: true,
        } as any,
      },
    });

    // Update progress
    await prisma.job.update({
      where: { id: jobId },
      data: { progress: 90 },
    }).catch(() => {});

    // ── Deduct credits ────────────────────────────────────────────────────
    try {
      await prisma.org.update({
        where: { id: orgId },
        data: { creditBalance: { decrement: creditCost } },
      });
    } catch (creditErr: any) {
      console.warn("[inline-generate] Credit deduction failed:", creditErr.message);
    }

    // ── Mark job COMPLETED ────────────────────────────────────────────────
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED" as any,
        progress: 100,
        completedAt: new Date(),
        result: {
          assetIds: [assetId],
          creditCost,
          totalAssets: 1,
          durationMs: orchestrated.totalPipelineMs,
          inlineGenerated: true,
        } as any,
      },
    });

    console.info(`[inline-generate] Job ${jobId} completed: asset=${assetId}, ${orchestrated.totalPipelineMs}ms`);

  } catch (err: any) {
    console.error(`[inline-generate] Job ${jobId} failed:`, err.message);

    // Mark job FAILED
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "FAILED" as any,
        failedAt: new Date(),
        result: {
          error: err.message ?? "Generation failed",
          failReason: err.message,
          inlineGenerated: true,
        } as any,
      },
    }).catch(() => {});
  }
}
