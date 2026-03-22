"use client";
// src/components/dashboard/EditorShell.tsx
// Arkiol Canvas — dual-path design workspace
//
// Three entry states:
//   1. AI-generated:  landing → pick format → write brief → generate → edit
//   2. Blank canvas:  landing → pick format (blank) → edit (empty canvas)
//   3. Load project:  /editor?assetId=xxx → loads existing asset → edit
//
// All three states converge at the same ArkiolEditor instance.

import React, { useState, useEffect, useCallback } from "react";
import {
  CATEGORY_LABELS, ARKIOL_CATEGORIES, ArkiolCategory, FORMAT_DIMS,
} from "../../lib/types";
import dynamic from "next/dynamic";
import type { EditorElement } from "../editor/ArkiolEditor";

const ArkiolEditor = dynamic(
  () => import("../editor/ArkiolEditor").then(m => ({ default: m.default ?? m.ArkiolEditor })),
  { ssr: false, loading: () => <EditorLoadingScreen /> }
);

// ── Types ────────────────────────────────────────────────────────────────────

type Step = "landing" | "format-ai" | "format-blank" | "brief" | "generating" | "loading" | "edit";
type EntryPath = "ai" | "blank";

interface EditorInit {
  projectId:    string;
  elements:     EditorElement[];
  bgColor:      string;
  canvasWidth:  number;
  canvasHeight: number;
  format:       ArkiolCategory;
}

// ── EditorShell component ────────────────────────────────────────────────────

export function EditorShell() {
  const [step,       setStep]       = useState<Step>("landing");
  const [entryPath,  setEntryPath]  = useState<EntryPath>("ai");
  const [format,     setFormat]     = useState<ArkiolCategory>("instagram_post");
  const [prompt,     setPrompt]     = useState("");
  const [style,      setStyle]      = useState("modern_minimal");
  const [vars,       setVars]       = useState(1);
  const [ytMode,     setYtMode]     = useState<"auto"|"face"|"product">("auto");
  const [jobId,      setJobId]      = useState<string | null>(null);
  const [progress,   setProgress]   = useState(0);
  const [error,      setError]      = useState<string | null>(null);
  const [editorInit, setEditorInit] = useState<EditorInit | null>(null);

  // Support direct load via ?assetId= query param
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const assetId = params.get("assetId");
    if (assetId) {
      setStep("loading");
      loadEditorElements(assetId, "instagram_post");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll job status
  useEffect(() => {
    if (!jobId || step !== "generating") return;
    const iv = setInterval(async () => {
      try {
        const res  = await fetch(`/api/jobs?id=${jobId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!data?.job) return;
        setProgress(data.job.progress ?? 0);
        if (data.job.status === "COMPLETED") {
          clearInterval(iv);
          const assetId = data.assets?.[0]?.id as string | undefined;
          if (!assetId) { setError("Generation completed but no asset was returned."); setStep("brief"); return; }
          setStep("loading");
          loadEditorElements(assetId, format);
        } else if (data.job.status === "FAILED") {
          clearInterval(iv);
          setError(data.job.error ?? "Generation failed");
          setStep("brief");
        }
      } catch { /* network hiccup — keep polling */ }
    }, 2000);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, step]);

  const loadEditorElements = useCallback(async (assetId: string, fmt: ArkiolCategory) => {
    const fallbackDims = FORMAT_DIMS[fmt] ?? { width: 1080, height: 1080 };
    const fallback: EditorInit = {
      projectId:    assetId,
      elements:     [],
      bgColor:      "#FFFFFF",
      canvasWidth:  fallbackDims.width,
      canvasHeight: fallbackDims.height,
      format:       fmt,
    };
    try {
      const res  = await fetch(`/api/editor/load?assetId=${encodeURIComponent(assetId)}`);
      const data = await res.json();
      if (!res.ok) { setEditorInit(fallback); setStep("edit"); return; }
      const bgEl = (data.elements as EditorElement[]).find(
        el => el.name === "Background" && el.type === "rect"
      );
      setEditorInit({
        projectId:    data.projectId ?? assetId,
        elements:     data.elements  ?? [],
        bgColor:      bgEl?.fill ?? "#FFFFFF",
        canvasWidth:  data.canvasWidth  ?? fallbackDims.width,
        canvasHeight: data.canvasHeight ?? fallbackDims.height,
        format:       fmt,
      });
      setStep("edit");
    } catch {
      setEditorInit(fallback);
      setStep("edit");
    }
  }, []);

  const generate = useCallback(async () => {
    setError(null); setStep("generating"); setProgress(0);
    try {
      const res = await fetch("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt, formats: [format], stylePreset: style, variations: vars,
          ...(format === "youtube_thumbnail" && { youtubeThumbnailMode: ytMode }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setJobId(data.jobId);
    } catch (e: any) { setError(e.message); setStep("brief"); }
  }, [format, prompt, style, vars, ytMode]);

  const openBlank = useCallback((fmt: ArkiolCategory) => {
    const dims = FORMAT_DIMS[fmt] ?? { width: 1080, height: 1080 };
    setFormat(fmt);
    setEditorInit({
      projectId:    `blank-${Date.now()}`,
      elements:     [],
      bgColor:      "#FFFFFF",
      canvasWidth:  dims.width,
      canvasHeight: dims.height,
      format:       fmt,
    });
    setStep("edit");
  }, []);

  // ── Breadcrumb ──────────────────────────────────────────────────────────────
  const showAIBreadcrumb = entryPath === "ai" && step !== "landing" && step !== "edit";

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--bg-base)" }}>

      {/* Breadcrumb bar */}
      <div style={{
        padding: "0 32px", height: 48,
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", gap: 6,
        fontSize: 13, color: "var(--text-muted)",
        background: "var(--bg-surface)",
        flexShrink: 0,
      }}>
        <button onClick={() => setStep("landing")} style={crumbBtn}>Arkiol Canvas</button>

        {showAIBreadcrumb && (
          <>
            <Chevron />
            <button onClick={() => setStep("format-ai")} style={crumbBtn}>Format</button>
            {["brief","generating","loading"].includes(step) && (
              <>
                <Chevron />
                <button
                  onClick={() => step !== "generating" && setStep("brief")}
                  style={{ ...crumbBtn, color: step === "brief" ? "var(--text-primary)" : undefined }}
                >Brief</button>
              </>
            )}
            {["generating","loading"].includes(step) && (
              <>
                <Chevron />
                <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                  {step === "generating" ? "Generating…" : "Loading…"}
                </span>
              </>
            )}
          </>
        )}

        {step === "format-blank" && (
          <>
            <Chevron />
            <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>Choose Format</span>
          </>
        )}

        {step === "edit" && editorInit && (
          <>
            <Chevron />
            <span style={{ color: "var(--text-secondary)" }}>
              {CATEGORY_LABELS[editorInit.format] ?? "Canvas"}
            </span>
            <Chevron />
            <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>Editor</span>
          </>
        )}

        {step === "edit" && editorInit && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setStep("landing")} style={ghostBtn}>← New canvas</button>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto" }}>

        {step === "landing" && (
          <LandingStep
            onGenerateAI={() => { setEntryPath("ai"); setStep("format-ai"); }}
            onStartBlank={() => { setEntryPath("blank"); setStep("format-blank"); }}
          />
        )}

        {step === "format-ai" && (
          <FormatPickerStep
            title="Choose your canvas format"
            subtitle="Generate with AI → pick the format your design will live in"
            selected={format}
            onSelect={f => { setFormat(f); setStep("brief"); }}
            onBack={() => setStep("landing")}
          />
        )}

        {step === "format-blank" && (
          <FormatPickerStep
            title="Choose your canvas format"
            subtitle="Start from blank → pick dimensions, open the editor instantly"
            selected={format}
            onSelect={f => openBlank(f)}
            onBack={() => setStep("landing")}
            actionLabel="Open Editor"
          />
        )}

        {step === "brief" && (
          <BriefStep
            format={format} prompt={prompt} setPrompt={setPrompt}
            style={style} setStyle={setStyle} vars={vars} setVars={setVars}
            ytMode={ytMode} setYtMode={setYtMode} error={error}
            onBack={() => setStep("format-ai")} onGenerate={generate}
          />
        )}

        {step === "generating" && <GeneratingStep progress={progress} format={format} />}
        {step === "loading"    && <LoadingEditorStep />}

        {step === "edit" && editorInit && (
          <div style={{ height: "calc(100vh - 48px)", overflow: "hidden" }}>
            <ArkiolEditor
              key={editorInit.projectId}
              projectId={editorInit.projectId}
              initialElements={editorInit.elements}
              canvasWidth={editorInit.canvasWidth}
              canvasHeight={editorInit.canvasHeight}
              canvasBg={editorInit.bgColor}
              readOnly={false}
              onSave={(_els) => {}}
            />
          </div>
        )}

        {step === "edit" && !editorInit && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 16 }}>
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Something went wrong opening the editor.</p>
            <button onClick={() => setStep("landing")} style={primaryBtn}>Back to Canvas</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function Chevron() {
  return <span style={{ color: "var(--border-strong)", fontSize: 10, userSelect: "none" }}>›</span>;
}

function LandingStep({ onGenerateAI, onStartBlank }: { onGenerateAI: () => void; onStartBlank: () => void }) {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "64px 40px 40px" }}>
      {/* Header */}
      <div style={{ marginBottom: 48 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "var(--accent-tint)", border: "1px solid var(--accent-border)",
          borderRadius: "var(--radius-full)", padding: "4px 12px",
          fontSize: 11, fontWeight: 600, color: "var(--accent)", letterSpacing: "0.06em",
          textTransform: "uppercase", marginBottom: 16,
        }}>
          ✦ Design Workspace
        </div>
        <h1 style={{
          margin: "0 0 10px", fontSize: 36, fontWeight: 800, lineHeight: 1.15,
          color: "var(--text-primary)", fontFamily: "var(--font-display)",
          letterSpacing: "-0.03em",
        }}>
          Arkiol Canvas
        </h1>
        <p style={{ margin: 0, fontSize: 16, color: "var(--text-secondary)", maxWidth: 480, lineHeight: 1.6 }}>
          Create designs with AI or build from scratch — both paths open the same full-featured editor.
        </p>
      </div>

      {/* Two paths */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 720 }}>

        {/* Path A — Generate with AI */}
        <button
          onClick={onGenerateAI}
          className="ak-card"
          style={{
            padding: "32px 28px", cursor: "pointer", textAlign: "left",
            display: "flex", flexDirection: "column", gap: 16,
            background: "linear-gradient(145deg, rgba(79,70,229,0.05) 0%, rgba(99,102,241,0.03) 100%)",
            border: "1.5px solid var(--accent-border)",
            borderRadius: "var(--radius-xl)",
            transition: "all 0.18s var(--ease-in-out)",
          }}
          onMouseEnter={e => {
            const el = e.currentTarget;
            el.style.borderColor = "var(--accent)";
            el.style.transform = "translateY(-2px)";
            el.style.boxShadow = "0 8px 24px rgba(79,70,229,0.12)";
          }}
          onMouseLeave={e => {
            const el = e.currentTarget;
            el.style.borderColor = "var(--accent-border)";
            el.style.transform = "";
            el.style.boxShadow = "";
          }}
        >
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: "linear-gradient(135deg, #4F46E5, #6366F1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, flexShrink: 0,
            boxShadow: "0 4px 12px rgba(79,70,229,0.25)",
          }}>✦</div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
              Generate with AI
            </div>
            <div style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Describe your design and Arkiol AI generates a fully-layered, editable canvas from your brief.
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {["Pick format", "Describe your vision", "AI generates layers", "Edit to perfection"].map((step, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-muted)" }}>
                <span style={{
                  width: 18, height: 18, borderRadius: 9,
                  background: "var(--accent-tint)", border: "1px solid var(--accent-border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 700, color: "var(--accent)", flexShrink: 0,
                }}>{i + 1}</span>
                {step}
              </div>
            ))}
          </div>

          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 13, fontWeight: 600, color: "var(--accent)",
            padding: "8px 16px",
            background: "var(--accent-tint)",
            border: "1px solid var(--accent-border)",
            borderRadius: "var(--radius-md)",
            alignSelf: "flex-start",
          }}>
            Start generating →
          </div>
        </button>

        {/* Path B — Start from Blank */}
        <button
          onClick={onStartBlank}
          className="ak-card"
          style={{
            padding: "32px 28px", cursor: "pointer", textAlign: "left",
            display: "flex", flexDirection: "column", gap: 16,
            background: "var(--bg-surface)",
            border: "1.5px solid var(--border)",
            borderRadius: "var(--radius-xl)",
            transition: "all 0.18s var(--ease-in-out)",
          }}
          onMouseEnter={e => {
            const el = e.currentTarget;
            el.style.borderColor = "var(--border-strong)";
            el.style.transform = "translateY(-2px)";
            el.style.boxShadow = "var(--shadow-md)";
          }}
          onMouseLeave={e => {
            const el = e.currentTarget;
            el.style.borderColor = "var(--border)";
            el.style.transform = "";
            el.style.boxShadow = "";
          }}
        >
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: "var(--bg-elevated)",
            border: "1.5px solid var(--border-strong)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, flexShrink: 0,
          }}>◻</div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
              Start from Blank
            </div>
            <div style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Open an empty canvas with correct dimensions and build your design from the ground up.
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {["Choose your format", "Open editor instantly", "Add text, shapes, images", "Save to your gallery"].map((step, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-muted)" }}>
                <span style={{
                  width: 18, height: 18, borderRadius: 9,
                  background: "var(--bg-elevated)", border: "1px solid var(--border-strong)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 700, color: "var(--text-secondary)", flexShrink: 0,
                }}>{i + 1}</span>
                {step}
              </div>
            ))}
          </div>

          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 13, fontWeight: 600, color: "var(--text-secondary)",
            padding: "8px 16px",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--radius-md)",
            alignSelf: "flex-start",
          }}>
            Open blank canvas →
          </div>
        </button>
      </div>

      <p style={{ marginTop: 28, fontSize: 12, color: "var(--text-muted)" }}>
        Both paths use the same full-featured Arkiol Editor — text, shapes, images, layers, multi-page, and export.
      </p>
    </div>
  );
}

const FORMAT_ICONS: Record<ArkiolCategory, string> = {
  instagram_post: "📷", instagram_story: "📱", youtube_thumbnail: "🎬",
  flyer: "📄", poster: "🖼️", presentation_slide: "📊",
  business_card: "💳", resume: "📋", logo: "✦",
};

const FORMAT_DESC: Record<ArkiolCategory, string> = {
  instagram_post:     "1080×1080 · Square",
  instagram_story:    "1080×1920 · Vertical",
  youtube_thumbnail:  "1280×720 · 16:9",
  flyer:              "2550×3300 · Letter",
  poster:             "2480×3508 · A4",
  presentation_slide: "1920×1080 · Widescreen",
  business_card:      "1050×600 · Card",
  resume:             "2550×3300 · Letter",
  logo:               "1000×1000 · Square",
};

function FormatPickerStep({
  title, subtitle, selected, onSelect, onBack, actionLabel,
}: {
  title: string; subtitle: string; selected: string;
  onSelect: (f: ArkiolCategory) => void; onBack: () => void;
  actionLabel?: string;
}) {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 40px" }}>
      <button onClick={onBack} style={backBtn}>← Back</button>

      <h2 style={{ margin: "16px 0 6px", fontSize: 24, fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-display)", letterSpacing: "-0.03em" }}>
        {title}
      </h2>
      <p style={{ margin: "0 0 28px", color: "var(--text-muted)", fontSize: 14 }}>{subtitle}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(185px, 1fr))", gap: 10 }}>
        {ARKIOL_CATEGORIES.map(cat => (
          <button key={cat} onClick={() => onSelect(cat)} style={{
            background: selected === cat ? "var(--accent-tint)" : "var(--bg-surface)",
            border: selected === cat ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
            borderRadius: "var(--radius-lg)", padding: "18px 16px",
            cursor: "pointer", textAlign: "left",
            transition: "all 0.15s",
            boxShadow: selected === cat ? "0 0 0 3px var(--accent-glow)" : "none",
          }}
          onMouseEnter={e => { if (selected !== cat) (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)"; }}
          onMouseLeave={e => { if (selected !== cat) (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
          >
            <div style={{ fontSize: 22, marginBottom: 8 }}>{FORMAT_ICONS[cat]}</div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
              {CATEGORY_LABELS[cat]}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{FORMAT_DESC[cat]}</div>
          </button>
        ))}
      </div>

      {actionLabel && (
        <div style={{ marginTop: 28 }}>
          <button
            onClick={() => onSelect(selected as ArkiolCategory)}
            style={{ ...primaryBtn, padding: "11px 28px" }}
          >
            {actionLabel} →
          </button>
        </div>
      )}
    </div>
  );
}

const STYLES = ["modern_minimal","bold_editorial","luxury_elegant","playful_vibrant","corporate_clean","retro_vintage"];
const STYLE_LABELS: Record<string, string> = {
  modern_minimal: "Modern Minimal",
  bold_editorial: "Bold Editorial",
  luxury_elegant: "Luxury Elegant",
  playful_vibrant: "Playful Vibrant",
  corporate_clean: "Corporate Clean",
  retro_vintage: "Retro Vintage",
};

function BriefStep({ format, prompt, setPrompt, style, setStyle, vars, setVars, ytMode, setYtMode, error, onBack, onGenerate }: any) {
  const isYt = format === "youtube_thumbnail";
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 40px" }}>
      <button onClick={onBack} style={backBtn}>← Back</button>

      <h2 style={{ margin: "16px 0 4px", fontSize: 24, fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-display)", letterSpacing: "-0.03em" }}>
        Describe your design
      </h2>
      <p style={{ margin: "0 0 28px", color: "var(--text-muted)", fontSize: 14 }}>
        {CATEGORY_LABELS[format as ArkiolCategory]} · AI will generate fully-editable layers
      </p>

      <label style={labelSt}>Design brief</label>
      <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
        placeholder="E.g. Bold summer sale for a luxury streetwear brand — dark navy palette with electric gold accents, bold headline, product image…"
        rows={4}
        style={{
          width: "100%", marginBottom: 24,
          background: "var(--bg-surface)", border: "1.5px solid var(--border)",
          borderRadius: "var(--radius-md)", color: "var(--text-primary)",
          padding: "12px 14px", fontSize: 13.5, resize: "vertical",
          fontFamily: "var(--font-body)", outline: "none",
          transition: "border-color 0.15s",
        }}
        onFocus={e => (e.target.style.borderColor = "var(--accent)")}
        onBlur={e => (e.target.style.borderColor = "var(--border)")}
      />

      <label style={labelSt}>Style preset</label>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 24 }}>
        {STYLES.map(s => (
          <button key={s} onClick={() => setStyle(s)} style={{
            borderRadius: "var(--radius-sm)", padding: "6px 12px", fontSize: 12.5,
            cursor: "pointer", transition: "all 0.15s", fontFamily: "var(--font-body)",
            background: style === s ? "var(--accent-tint)" : "var(--bg-surface)",
            color: style === s ? "var(--accent)" : "var(--text-secondary)",
            border: style === s ? "1.5px solid var(--accent-border)" : "1.5px solid var(--border)",
            fontWeight: style === s ? 600 : 400,
          }}>{STYLE_LABELS[s] ?? s}</button>
        ))}
      </div>

      <label style={labelSt}>Variations</label>
      <div style={{ display: "flex", gap: 8, marginBottom: isYt ? 24 : 32 }}>
        {[1,2,3].map(n => (
          <button key={n} onClick={() => setVars(n)} style={{
            width: 44, height: 38, borderRadius: "var(--radius-md)", fontSize: 14,
            cursor: "pointer", fontWeight: 600, transition: "all 0.15s",
            background: vars === n ? "var(--accent-tint)" : "var(--bg-surface)",
            color: vars === n ? "var(--accent)" : "var(--text-secondary)",
            border: vars === n ? "1.5px solid var(--accent-border)" : "1.5px solid var(--border)",
          }}>{n}</button>
        ))}
      </div>

      {isYt && (
        <>
          <label style={labelSt}>Thumbnail focus</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
            {["auto","face","product"].map(m => (
              <button key={m} onClick={() => setYtMode(m)} style={{
                borderRadius: "var(--radius-sm)", padding: "6px 14px", fontSize: 12.5,
                cursor: "pointer", transition: "all 0.15s",
                background: ytMode === m ? "var(--accent-tint)" : "var(--bg-surface)",
                color: ytMode === m ? "var(--accent)" : "var(--text-secondary)",
                border: ytMode === m ? "1.5px solid var(--accent-border)" : "1.5px solid var(--border)",
                fontWeight: ytMode === m ? 600 : 400, textTransform: "capitalize",
              }}>{m}</button>
            ))}
          </div>
        </>
      )}

      {error && (
        <div style={{
          marginBottom: 20, padding: "12px 16px",
          background: "var(--error-tint)", border: "1px solid var(--error-border)",
          borderRadius: "var(--radius-md)", fontSize: 13.5, color: "var(--error)",
        }}>⚠ {error}</div>
      )}

      <button onClick={onGenerate} disabled={!prompt.trim()} style={{
        ...primaryBtn,
        opacity: prompt.trim() ? 1 : 0.45,
        cursor: prompt.trim() ? "pointer" : "not-allowed",
        padding: "11px 28px",
      }}>
        Generate Design →
      </button>
    </div>
  );
}

function GeneratingStep({ progress, format }: { progress: number; format: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 24 }}>
      <div style={{
        width: 64, height: 64, borderRadius: 18,
        background: "linear-gradient(135deg, var(--accent), var(--accent-light))",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 28, animation: "spin 3s linear infinite",
        boxShadow: "0 8px 24px rgba(79,70,229,0.2)",
      }}>✦</div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>

      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
          Generating {CATEGORY_LABELS[format as ArkiolCategory]}
        </div>
        <div style={{ fontSize: 13.5, color: "var(--text-muted)" }}>
          AI is crafting your design — this usually takes 15–30 seconds
        </div>
      </div>

      <div style={{ width: 320, background: "var(--bg-elevated)", borderRadius: 99, height: 6, overflow: "hidden", border: "1px solid var(--border)" }}>
        <div style={{
          height: "100%",
          width: `${Math.max(4, progress)}%`,
          background: "linear-gradient(90deg, var(--accent), var(--accent-light))",
          borderRadius: 99,
          transition: "width 0.5s ease",
        }} />
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{progress}%</div>
    </div>
  );
}

function LoadingEditorStep() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 18 }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        border: "2.5px solid var(--accent)",
        borderTopColor: "transparent",
        animation: "spin 0.8s linear infinite",
      }} />
      <style>{`@keyframes spin { to{transform:rotate(360deg)} }`}</style>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
          Preparing your canvas…
        </div>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Converting generated layers into editable elements
        </div>
      </div>
    </div>
  );
}

function EditorLoadingScreen() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", gap: 12 }}>
      <div style={{ width: 20, height: 20, borderRadius: 4, border: "2px solid var(--accent)", borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin { to{transform:rotate(360deg)} }`}</style>
      <span style={{ color: "var(--text-muted)", fontSize: 13.5 }}>Loading editor…</span>
    </div>
  );
}

// ── Shared styles ────────────────────────────────────────────────────────────

const crumbBtn: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  color: "var(--text-muted)", padding: "0 2px", fontSize: "inherit",
  fontFamily: "var(--font-body)",
  transition: "color 0.12s",
};

const backBtn: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  color: "var(--text-muted)", padding: 0, fontSize: 13.5,
  fontFamily: "var(--font-body)",
};

const ghostBtn: React.CSSProperties = {
  background: "none",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  cursor: "pointer", color: "var(--text-secondary)",
  padding: "5px 12px", fontSize: 12.5,
  fontFamily: "var(--font-body)",
  transition: "all 0.12s",
};

const primaryBtn: React.CSSProperties = {
  background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-light) 100%)",
  border: "none", borderRadius: "var(--radius-md)",
  color: "#fff", padding: "10px 24px",
  fontSize: 13.5, fontWeight: 600, cursor: "pointer",
  fontFamily: "var(--font-body)",
  boxShadow: "0 2px 8px rgba(79,70,229,0.20)",
};

const labelSt: React.CSSProperties = {
  display: "block", fontSize: 11.5, fontWeight: 600,
  color: "var(--text-secondary)", marginBottom: 8,
  letterSpacing: "0.06em", textTransform: "uppercase",
  fontFamily: "var(--font-body)",
};
