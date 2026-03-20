"use client";
// src/components/ArkiolLogo.tsx
// Animated orbital ring logo mark for Arkiol.
// Usage: <ArkiolLogo collapsed={collapsed} />

interface ArkiolLogoProps {
  collapsed?: boolean;
  size?: "sm" | "lg";
}

export function ArkiolLogo({ collapsed = false, size = "sm" }: ArkiolLogoProps) {
  const sm = size === "sm";
  const D  = sm ? 30 : 96;
  const d1 = sm ? 22 : 72;
  const d2 = sm ? 14 : 48;
  const cd = sm ? 10 : 32;
  const fs = sm ? 7  : 20;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: collapsed ? 0 : sm ? 10 : 18, flexShrink: 0, overflow: "hidden" }}>

      {/* ── Orbital ring mark ── */}
      <div style={{ width: D, height: D, position: "relative", flexShrink: 0 }}>

        {/* Outer ring — slow clockwise */}
        <svg width={D} height={D} viewBox={`0 0 ${D} ${D}`}
          style={{ position: "absolute", inset: 0, animation: "arkiol-spin1 14s linear infinite", overflow: "visible" }}>
          <defs>
            <linearGradient id="aLg1" x1="0" y1="0" x2={D} y2={D} gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor="#7c7ffa" stopOpacity={0.9} />
              <stop offset="50%"  stopColor="#22d3ee" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#7c7ffa" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <circle cx={D/2} cy={D/2} r={D/2 - 1} fill="none"
            stroke="url(#aLg1)" strokeWidth={sm ? 0.8 : 1} strokeDasharray={sm ? "5 4" : "10 6"} />
          <circle cx={D/2} cy={1} r={sm ? 1.5 : 3} fill="#7c7ffa" opacity={0.9} />
        </svg>

        {/* Mid ring — counter-clockwise */}
        <svg width={d1} height={d1} viewBox={`0 0 ${d1} ${d1}`}
          style={{ position: "absolute", top: (D-d1)/2, left: (D-d1)/2, animation: "arkiol-spin2 10s linear infinite", overflow: "visible" }}>
          <defs>
            <linearGradient id="aLg2" x1={d1} y1="0" x2="0" y2={d1} gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor="#22d3ee" stopOpacity={0.7} />
              <stop offset="60%"  stopColor="#7c7ffa" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity={0}   />
            </linearGradient>
          </defs>
          <path d={`M${d1/2} 2 A${d1/2-2} ${d1/2-2} 0 1 1 ${d1/2-0.1} 2`}
            fill="none" stroke="url(#aLg2)" strokeWidth={sm ? 0.7 : 1.2} strokeLinecap="round" />
          <circle cx={d1/2} cy={2} r={sm ? 1.2 : 2.5} fill="#22d3ee" opacity={0.8} />
        </svg>

        {/* Inner ring — fast clockwise */}
        <svg width={d2} height={d2} viewBox={`0 0 ${d2} ${d2}`}
          style={{ position: "absolute", top: (D-d2)/2, left: (D-d2)/2, animation: "arkiol-spin3 7s linear infinite", overflow: "visible" }}>
          <circle cx={d2/2} cy={d2/2} r={d2/2 - 1} fill="none"
            stroke="rgba(245,158,107,0.3)" strokeWidth={sm ? 0.6 : 0.8} strokeDasharray={sm ? "3 6" : "5 10"} />
          <circle cx={d2/2} cy={1} r={sm ? 1 : 2} fill="#f59e6b" opacity={0.7} />
        </svg>

        {/* Static glowing centre */}
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          width: cd, height: cd, borderRadius: "50%",
          background: "linear-gradient(135deg, rgba(124,127,250,0.22), rgba(85,88,224,0.32))",
          border: "1px solid rgba(124,127,250,0.35)",
          boxShadow: "0 0 16px rgba(124,127,250,0.4), 0 0 40px rgba(124,127,250,0.15), inset 0 1px 0 rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{
            fontSize: fs, fontWeight: 800, fontFamily: "var(--font-display)",
            background: "linear-gradient(135deg, #a5a8ff, #7c7ffa)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            lineHeight: 1, letterSpacing: "-0.04em",
          }}>a</span>
        </div>
      </div>

      {/* Wordmark — hidden when collapsed */}
      {!collapsed && (
        <span style={{
          fontWeight: 800, fontSize: sm ? 17 : 42,
          letterSpacing: sm ? "-0.05em" : "-0.04em",
          color: "var(--text-primary)", whiteSpace: "nowrap",
          fontFamily: "var(--font-display)", lineHeight: 1,
        }}>
          arkiol
        </span>
      )}

      {/* CSS keyframes — injected once */}
      <style>{`
        @keyframes arkiol-spin1 { to { transform: rotate(360deg);  } }
        @keyframes arkiol-spin2 { to { transform: rotate(-360deg); } }
        @keyframes arkiol-spin3 { to { transform: rotate(360deg);  } }
      `}</style>
    </div>
  );
}
