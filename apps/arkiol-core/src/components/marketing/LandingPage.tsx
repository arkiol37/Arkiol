// src/components/marketing/LandingPage.tsx — v10
// Extracted from app/(marketing)/home/page.tsx for clean import by both:
//   • app/(marketing)/home/page.tsx (route handler)
//   • app/page.tsx (root redirect page)
// AI Creative Studio landing page with interactive prompt demo

"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";

const FEATURES = [
  {
    icon: "◎", color: "#7c7ffa",
    title: "7-Stage AI Pipeline",
    desc: "Intent → Layout → Variations → Audience → Density → Brand → Render. Every output is architecturally intentional.",
  },
  {
    icon: "◈", color: "#9b5de5",
    title: "Brand Kit Intelligence",
    desc: "Upload colors, fonts, voice, and logo. Every generation locks to your identity — zero manual tweaking.",
  },
  {
    icon: "⬡", color: "#22d3ee",
    title: "Multi-Format Output",
    desc: "One prompt. YouTube thumbnails, Instagram posts, ads, banners, logos — all sized and optimized simultaneously.",
  },
  {
    icon: "✦", color: "#f472b6",
    title: "Creative Exploration",
    desc: "Arkiol generates 8 candidate directions, scores them by novelty + brand fit, and surfaces the best.",
  },
  {
    icon: "⟳", color: "#fbbf24",
    title: "Animated GIF Export",
    desc: "Motion-ready assets for social. Loop animations generated from the same prompt — no After Effects.",
  },
  {
    icon: "◉", color: "#34d399",
    title: "Arkiol Ads",
    desc: "Brief → full campaign. Arkiol orchestrates a sequence of assets, captions, and variants in one flow.",
  },
];

const PLANS = [
  { name: "Free",    price: "$0",  period: "/mo", credits: "1 free Ad/day",   members: "",                  cta: "Get started free",  highlight: false },
  { name: "Creator", price: "$25", period: "/mo", credits: "500 credits/mo",   members: "",                  cta: "Start free trial",  highlight: false },
  { name: "Pro",     price: "$79", period: "/mo", credits: "1,700 credits/mo", members: "",                  cta: "Start free trial",  highlight: true  },
  { name: "Studio",  price: "$249",period: "/mo", credits: "6,000 credits/mo", members: "Up to 50 members",  cta: "Contact sales",     highlight: false },
];

const DEMO_PROMPTS = [
  "Bold product launch for a minimalist skincare brand — warm neutrals, elegant type",
  "High-energy gaming channel thumbnail — dark mode, neon accents, action composition",
  "Luxury real estate listing — architectural photography feel, gold accents, premium type",
  "Startup SaaS launch announcement — clean tech aesthetic, blue gradients",
];

const DEMO_OUTPUTS = [
  { format: "YouTube Thumbnail", color: "#ef4444", icon: "▶" },
  { format: "Instagram Post",    color: "#a855f7", icon: "◻" },
  { format: "Instagram Story",   color: "#ec4899", icon: "◻" },
  { format: "Display Ad",        color: "#3b82f6", icon: "◻" },
  { format: "Banner",            color: "#22d3ee", icon: "▬" },
  { format: "Facebook Post",     color: "#4f46e5", icon: "◻" },
];

const ENGINES = [
  { name: "Exploration Engine",       desc: "Scores and ranks creative candidates using cosine drift detection",      icon: "◎", color: "#7c7ffa" },
  { name: "Platform Intelligence",    desc: "Optimizes layout, density, and composition per target platform",         icon: "⬡", color: "#22d3ee" },
  { name: "Brand Lock System",        desc: "Enforces brand compliance across all generated outputs",                 icon: "◈", color: "#9b5de5" },
  { name: "Arkiol Ads",         desc: "Orchestrates multi-asset campaign flows from a single brief",            icon: "⟳", color: "#f472b6" },
];

function PromptDemo() {
  const [activePrompt, setActivePrompt] = useState(0);
  const [typing, setTyping] = useState(true);
  const [displayedText, setDisplayedText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [showOutputs, setShowOutputs] = useState(false);

  const currentPrompt = DEMO_PROMPTS[activePrompt];

  useEffect(() => {
    setTyping(true);
    setShowOutputs(false);
    setGenerating(false);
    setDisplayedText("");
    let i = 0;
    const t = setInterval(() => {
      i++;
      setDisplayedText(currentPrompt.slice(0, i));
      if (i >= currentPrompt.length) {
        clearInterval(t);
        setTyping(false);
        setTimeout(() => {
          setGenerating(true);
          setTimeout(() => { setGenerating(false); setShowOutputs(true); }, 1800);
        }, 400);
      }
    }, 28);
    return () => clearInterval(t);
  }, [activePrompt]);

  // Cycle prompts
  useEffect(() => {
    const t = setTimeout(() => {
      setActivePrompt(p => (p + 1) % DEMO_PROMPTS.length);
    }, 7500);
    return () => clearTimeout(t);
  }, [activePrompt]);

  return (
    <div className="ak-demo-terminal" style={{ maxWidth: 680, margin: "0 auto" }}>
      {/* Terminal top bar */}
      <div className="ak-demo-topbar">
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
        </div>
        <span style={{ fontSize: 11.5, color: "var(--text-muted)", letterSpacing: "0.03em", fontFamily: "var(--font-mono)" }}>
          arkiol · where creativity meets ai
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {[0,1,2,3].map(i => (
            <div key={i} onClick={() => setActivePrompt(i)} style={{
              width: 6, height: 6, borderRadius: "50%", cursor: "pointer",
              background: i === activePrompt ? "var(--accent)" : "rgba(255,255,255,0.15)",
              transition: "background 0.3s",
            }} />
          ))}
        </div>
      </div>

      {/* Prompt input area */}
      <div style={{ padding: "20px 22px 16px" }}>
        <div style={{ marginBottom: 8, fontSize: 10.5, color: "var(--text-muted)", letterSpacing: "0.06em", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
          Prompt
        </div>
        <div style={{
          background: "rgba(26,26,42,0.6)", borderRadius: "var(--radius-lg)",
          border: "1px solid rgba(124,127,250,0.14)", padding: "12px 16px",
          fontSize: 13.5, color: "var(--text-primary)", lineHeight: 1.55,
          minHeight: 52, fontFamily: "var(--font-body)",
        }}>
          {displayedText}
          {typing && <span style={{ animation: "ak-blink 0.8s step-end infinite", color: "var(--accent)", fontWeight: 300 }}>|</span>}
        </div>

        {/* Generating state */}
        {generating && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, padding: "10px 14px", background: "rgba(124,127,250,0.07)", borderRadius: "var(--radius-lg)", border: "1px solid rgba(124,127,250,0.12)" }}>
            <div style={{
              width: 16, height: 16, borderRadius: "50%",
              border: "2px solid rgba(124,127,250,0.3)", borderTopColor: "#7c7ffa",
              animation: "ak-spin 0.75s linear infinite", flexShrink: 0,
            }} />
            <span style={{ fontSize: 12, color: "var(--accent-light)" }}>
              Applying layout intelligence · Exploring variations · Ranking candidates…
            </span>
          </div>
        )}

        {/* Output formats grid */}
        {showOutputs && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 10.5, color: "var(--text-muted)", letterSpacing: "0.06em", fontFamily: "var(--font-mono)", textTransform: "uppercase", marginBottom: 10 }}>
              Generated · 6 formats
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {DEMO_OUTPUTS.map((o, i) => (
                <div key={o.format} style={{
                  padding: "10px 12px", borderRadius: "var(--radius-md)",
                  background: `${o.color}11`, border: `1px solid ${o.color}22`,
                  animation: `ak-scale-in 240ms ease both`, animationDelay: `${i * 55}ms`,
                }}>
                  <div style={{ fontSize: 16, marginBottom: 4, color: o.color }}>{o.icon}</div>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "-0.01em" }}>{o.format}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 5 }}>
                    <div style={{ height: 3, flex: 1, background: "rgba(255,255,255,0.06)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${72 + i * 4}%`, background: o.color, borderRadius: "var(--radius-full)" }} />
                    </div>
                    <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: o.color }}>{72 + i * 4}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
              <Link href="/register" className="ak-btn ak-btn-primary ak-btn-sm" style={{ fontSize: 12, gap: 6 }}>
                Try it free
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const s = { section: { maxWidth: 1140, margin: "0 auto", padding: "0 28px" } as React.CSSProperties };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)", overflowX: "hidden" }}>

      {/* Nav */}
      <nav style={{ borderBottom: "1px solid var(--border)", position: "sticky", top: 0, background: "rgba(10,10,18,0.92)", backdropFilter: "blur(18px)", zIndex: 100 }}>
        <div style={{ ...s.section, display: "flex", alignItems: "center", justifyContent: "space-between", height: 62 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: "var(--radius-sm)", background: "linear-gradient(145deg, var(--accent), #9b5de5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff", fontFamily: "var(--font-display)", boxShadow: "0 0 18px var(--accent-glow)" }}>A</div>
            <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.05em", fontFamily: "var(--font-display)" }}>Arkiol</span>
            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", background: "var(--accent-tint)", border: "1px solid var(--border-accent)", borderRadius: "var(--radius-full)", color: "var(--accent-light)", letterSpacing: "0.06em" }}>AI STUDIO</span>
          </div>
          <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
            <a href="#features" style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none", transition: "color 150ms" }}>Features</a>
            <a href="#engines" style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none", transition: "color 150ms" }}>Engines</a>
            <a href="#pricing" style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none", transition: "color 150ms" }}>Pricing</a>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Link href="/login" style={{ padding: "7px 18px", color: "var(--text-secondary)", fontSize: 13.5, fontWeight: 500, textDecoration: "none", borderRadius: "var(--radius-md)", transition: "color 150ms" }}>
              Sign in
            </Link>
            <Link href="/register" style={{ padding: "8px 20px", background: "linear-gradient(135deg, var(--accent), #9b5de5)", color: "#fff", fontSize: 13.5, fontWeight: 600, textDecoration: "none", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-accent)" }}>
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ padding: "96px 0 72px", position: "relative", overflow: "hidden" }}>
        {/* Background glow blobs */}
        <div style={{ position: "absolute", top: -120, left: "50%", transform: "translateX(-50%)", width: 1000, height: 600, background: "radial-gradient(ellipse, rgba(124,127,250,0.16) 0%, transparent 68%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 40, right: "8%", width: 340, height: 340, background: "radial-gradient(ellipse, rgba(244,114,182,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: "5%", width: 280, height: 280, background: "radial-gradient(ellipse, rgba(34,211,238,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ ...s.section, textAlign: "center", position: "relative" }}>
          {/* Eyebrow badge */}
          <div className="ak-fade-in" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "5px 14px 5px 8px",
            background: "var(--accent-tint)", border: "1px solid var(--border-accent)",
            borderRadius: "var(--radius-full)", fontSize: 12, fontWeight: 600,
            color: "var(--accent-light)", marginBottom: 32, letterSpacing: "0.02em",
          }}>
            <span style={{ padding: "2px 8px", background: "var(--accent)", color: "#fff", borderRadius: "var(--radius-full)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em" }}>NEW</span>
            Arkiol — Where Creativity Meets AI
          </div>

          {/* Main headline */}
          <h1 className="ak-fade-in ak-stagger-1" style={{
            margin: "0 0 24px",
            fontSize: "clamp(42px, 6.5vw, 80px)",
            fontWeight: 800, letterSpacing: "-0.055em", lineHeight: 1.02,
            fontFamily: "var(--font-display)",
          }}>
            One prompt.{" "}
            <span style={{ background: "linear-gradient(135deg, var(--accent) 0%, #9b5de5 45%, var(--pink) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Every format.
            </span>
            <br />
            <span style={{ color: "var(--text-secondary)", fontWeight: 600, fontSize: "0.72em" }}>
              AI-generated design for modern creators.
            </span>
          </h1>

          {/* Supporting description */}
          <p className="ak-fade-in ak-stagger-2" style={{
            margin: "0 auto 48px", maxWidth: 600,
            fontSize: "clamp(15px, 2vw, 18px)", color: "var(--text-muted)", lineHeight: 1.7,
          }}>
            Arkiol's 7-stage AI pipeline generates YouTube thumbnails, Instagram posts, ads, banners,
            logos, and more — simultaneously, from a single prompt. Feed it your brand kit and every
            output is locked to your identity.
          </p>

          {/* CTAs */}
          <div className="ak-fade-in ak-stagger-3" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 14 }}>
            <Link href="/register" style={{
              display: "inline-flex", alignItems: "center", gap: 9,
              padding: "15px 36px", background: "linear-gradient(135deg, var(--accent), #9b5de5)",
              color: "#fff", fontSize: 15, fontWeight: 700, textDecoration: "none",
              borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-accent-lg)", letterSpacing: "-0.02em",
            }}>
              Start for free
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
            <Link href="/login" style={{
              display: "inline-flex", alignItems: "center", gap: 9,
              padding: "15px 30px", background: "rgba(255,255,255,0.04)",
              color: "var(--text-secondary)", fontSize: 15, fontWeight: 500,
              textDecoration: "none", borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-strong)", backdropFilter: "blur(8px)",
            }}>
              View demo
            </Link>
          </div>
          <p className="ak-fade-in ak-stagger-4" style={{ fontSize: 12, color: "var(--text-muted)" }}>
            No credit card required · 1 free Ad/day · Cancel anytime
          </p>

          {/* Social proof strip */}
          <div className="ak-fade-in ak-stagger-5" style={{ display: "flex", justifyContent: "center", gap: 32, marginTop: 40, paddingTop: 32, borderTop: "1px solid var(--border)", flexWrap: "wrap" }}>
            {[
              { value: "50+", label: "Output formats" },
              { value: "7-stage", label: "AI pipeline" },
              { value: "< 10s", label: "Average render" },
              { value: "99.9%", label: "Uptime SLA" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--font-display)", letterSpacing: "-0.05em", color: "var(--text-primary)", marginBottom: 2 }}>{s.value}</div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", letterSpacing: "0.02em" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Interactive Prompt Demo ── */}
      <section style={{ padding: "80px 0", background: "var(--bg-surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div style={s.section}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div className="ak-section-badge ak-section-badge-high" style={{ display: "inline-flex", marginBottom: 16 }}>
              ✦ Live Demo
            </div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, letterSpacing: "-0.045em", marginBottom: 14, fontFamily: "var(--font-display)" }}>
              Watch one prompt become{" "}
              <span style={{ background: "linear-gradient(135deg, var(--accent), var(--pink))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                six formats
              </span>
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: 16, maxWidth: 480, margin: "0 auto" }}>
              Arkiol generates YouTube thumbnails, Instagram posts, ads, stories, and banners simultaneously — all optimized for their platform.
            </p>
          </div>
          <PromptDemo />
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ padding: "96px 0" }}>
        <div style={s.section}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 46px)", fontWeight: 800, letterSpacing: "-0.045em", marginBottom: 14 }}>
              Everything you need to design at scale
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: 17, maxWidth: 520, margin: "0 auto" }}>
              From ideation to export in seconds — with your brand baked in at every step.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="ak-glass-card" style={{ padding: "28px 26px" }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "var(--radius-lg)", marginBottom: 18,
                  background: `${f.color}18`, border: `1px solid ${f.color}28`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, color: f.color,
                }}>{f.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-display)", margin: "0 0 9px", letterSpacing: "-0.03em" }}>{f.title}</h3>
                <p style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Intelligent Engines ── */}
      <section id="engines" style={{ padding: "96px 0", background: "var(--bg-surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div style={s.section}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 72, alignItems: "center" }}>
            <div>
              <div className="ak-section-badge ak-section-badge-high" style={{ display: "inline-flex", marginBottom: 22 }}>
                ◎ AI Engines
              </div>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 46px)", fontWeight: 800, letterSpacing: "-0.045em", marginBottom: 18, lineHeight: 1.1 }}>
                Four engines.<br />
                <span style={{ color: "var(--text-secondary)", fontWeight: 600, fontSize: "0.8em" }}>
                  One creative system.
                </span>
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: 16, lineHeight: 1.7, maxWidth: 420 }}>
                Arkiol isn't a single model — it's an orchestrated pipeline of specialized engines that work together to produce reliably excellent creative output.
              </p>
              <div style={{ marginTop: 32 }}>
                <Link href="/register" className="ak-btn ak-btn-primary" style={{ padding: "12px 28px" }}>
                  Explore the studio →
                </Link>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {ENGINES.map((engine, i) => (
                <div key={i} className="ak-glass-card" style={{
                  padding: "18px 20px", display: "flex", alignItems: "flex-start", gap: 16,
                  animationDelay: `${i * 60}ms`,
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: "var(--radius-md)", flexShrink: 0,
                    background: `${engine.color}18`, border: `1px solid ${engine.color}28`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, color: engine.color,
                  }}>{engine.icon}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-display)", letterSpacing: "-0.02em", marginBottom: 4 }}>{engine.name}</div>
                    <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.55 }}>{engine.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Campaign Generation ── */}
      <section style={{ padding: "96px 0" }}>
        <div style={s.section}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div className="ak-section-badge ak-section-badge-experimental" style={{ display: "inline-flex", marginBottom: 18 }}>
              ⟳ Arkiol Ads
            </div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 46px)", fontWeight: 800, letterSpacing: "-0.045em", marginBottom: 16 }}>
              Brief → full campaign
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: 17, maxWidth: 540, margin: "0 auto" }}>
              Describe your campaign goal and Arkiol generates every asset you need — ads, social posts, thumbnails, banners, and copy — in a single orchestrated flow.
            </p>
          </div>
          <div style={{
            background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-2xl)",
            padding: "36px", maxWidth: 720, margin: "0 auto",
            boxShadow: "0 4px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}>
            {/* Brief input mockup */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 8 }}>Campaign Brief</div>
              <div style={{ background: "var(--bg-input)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius-md)", padding: "13px 16px", fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                Launch campaign for our new AI productivity app — target tech-savvy professionals, emphasize speed and simplicity, modern dark aesthetic with blue accents
              </div>
            </div>
            {/* Output tiles */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {[
                { label: "YouTube Ad", color: "#ef4444", score: 92 },
                { label: "Instagram Post", color: "#a855f7", score: 88 },
                { label: "Display Banner", color: "#3b82f6", score: 85 },
                { label: "Twitter Card", color: "#22d3ee", score: 91 },
              ].map((item, i) => (
                <div key={i} style={{
                  padding: "14px 12px", borderRadius: "var(--radius-lg)",
                  background: `${item.color}0e`, border: `1px solid ${item.color}20`,
                  textAlign: "center", animation: "ak-scale-in 300ms ease both",
                  animationDelay: `${200 + i * 80}ms`,
                }}>
                  <div style={{
                    width: "100%", aspectRatio: "16/9", borderRadius: "var(--radius-md)",
                    background: `linear-gradient(135deg, ${item.color}22, ${item.color}08)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: 8, fontSize: 18, color: item.color,
                  }}>◫</div>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "-0.01em", marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 9.5, fontFamily: "var(--font-mono)", color: item.color }}>Score {item.score}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" style={{ padding: "96px 0", background: "var(--bg-surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div style={s.section}>
          <div style={{ textAlign: "center", marginBottom: 54 }}>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 46px)", fontWeight: 800, letterSpacing: "-0.045em", marginBottom: 14 }}>Simple, transparent pricing</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 17 }}>Start free, scale as you grow. Cancel anytime.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, maxWidth: 1100, margin: "0 auto" }}>
            {PLANS.map((plan, i) => (
              <div key={i} className={plan.highlight ? "" : "ak-glass-card"} style={{
                background: plan.highlight ? "var(--accent-tint-md)" : undefined,
                border: plan.highlight ? "1px solid var(--border-accent)" : undefined,
                borderRadius: "var(--radius-2xl)", padding: "30px 26px",
                boxShadow: plan.highlight ? "var(--shadow-accent), 0 0 60px rgba(124,127,250,0.12)" : undefined,
                position: "relative",
              }}>
                {plan.highlight && (
                  <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)" }}>
                    <span className="ak-badge ak-badge-accent" style={{ fontSize: 11 }}>Most Popular</span>
                  </div>
                )}
                <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, letterSpacing: "-0.04em", marginBottom: 8 }}>{plan.name}</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 38, fontWeight: 800, letterSpacing: "-0.05em", marginBottom: 6 }}>
                  {plan.price}<span style={{ fontSize: 14, fontWeight: 400, color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>{plan.period}</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>{plan.credits}</div>
                {plan.members && <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 26 }}>{plan.members}</div>}
                <Link href="/register" style={{
                  display: "block", textAlign: "center", padding: "11px",
                  background: plan.highlight ? "linear-gradient(135deg, var(--accent), #9b5de5)" : "var(--bg-overlay)",
                  color: "#fff", fontSize: 13.5, fontWeight: 600, textDecoration: "none",
                  borderRadius: "var(--radius-md)", border: `1px solid ${plan.highlight ? "transparent" : "var(--border-strong)"}`,
                  boxShadow: plan.highlight ? "var(--shadow-accent)" : "none",
                }}>{plan.cta}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: "96px 0", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 600, height: 400, background: "radial-gradient(ellipse, rgba(124,127,250,0.14) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ ...s.section, position: "relative" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 14px",
            background: "var(--accent-tint)", border: "1px solid var(--border-accent)",
            borderRadius: "var(--radius-full)", fontSize: 11.5, fontWeight: 600,
            color: "var(--accent-light)", marginBottom: 28, letterSpacing: "0.04em",
          }}>
            ✦ Start creating today
          </div>
          <h2 style={{ fontSize: "clamp(32px, 5vw, 60px)", fontWeight: 800, letterSpacing: "-0.05em", marginBottom: 18, lineHeight: 1.06 }}>
            Your brand.<br />
            <span style={{ background: "linear-gradient(135deg, var(--accent) 0%, #9b5de5 55%, var(--pink) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Every format. Instantly.
            </span>
          </h2>
          <p style={{ fontSize: 17, color: "var(--text-muted)", maxWidth: 460, margin: "0 auto 40px", lineHeight: 1.65 }}>
            Join thousands of creators and teams using Arkiol to generate on-brand visual assets at scale.
          </p>
          <Link href="/register" style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            padding: "16px 40px", background: "linear-gradient(135deg, var(--accent), #9b5de5)",
            color: "#fff", fontSize: 16, fontWeight: 700, textDecoration: "none",
            borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-accent-lg)", letterSpacing: "-0.02em",
          }}>
            Get started free
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
          <p style={{ marginTop: 16, fontSize: 12, color: "var(--text-muted)" }}>No credit card required · 1 free Ad/day</p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: "32px 0", borderTop: "1px solid var(--border)" }}>
        <div style={{ ...s.section, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 22, height: 22, borderRadius: 5, background: "linear-gradient(145deg, var(--accent), #9b5de5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#fff" }}>A</div>
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-display)", letterSpacing: "-0.04em" }}>Arkiol</span>
          </div>
          <div style={{ display: "flex", gap: 20, fontSize: 12, color: "var(--text-muted)" }}>
            <Link href="/privacy" style={{ textDecoration: "none", color: "inherit" }}>Privacy</Link>
            <Link href="/terms" style={{ textDecoration: "none", color: "inherit" }}>Terms</Link>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>© {new Date().getFullYear()} Arkiol. Where Creativity Meets AI.</div>
        </div>
      </footer>
    </div>
  );
}
