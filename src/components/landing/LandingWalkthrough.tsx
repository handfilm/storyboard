import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { HOMEPAGE_SLIDES, HomepageSlide, SlideWidgetKey } from "../../data/homepageSlides";

export interface LandingWalkthroughProps {
  onLaunchStudio: () => void;
}

export type WidgetKey = SlideWidgetKey;
export type SlideData = HomepageSlide;
export const SLIDES_DATA = HOMEPAGE_SLIDES;


const GOLD_TEXT =
  "bg-gradient-to-b from-[#FFF2B2] via-[#F5A623] to-[#B45309] bg-clip-text text-transparent";
const GLOW_STYLE: CSSProperties = {
  filter: "drop-shadow(0 0 25px rgba(245, 166, 35, 0.45))",
};
const MONO = "font-mono tracking-wider";

const pad = (n: number, width = 2): string => String(Math.floor(n)).padStart(width, "0");

const frameToTimecode = (frame: number, fps = 24): string => {
  const f = frame % fps;
  const totalSeconds = Math.floor(frame / fps);
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600);
  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
};

const Panel = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`rounded border border-[#23232D] bg-[#0B0B0E]/95 p-4 md:p-5 shadow-2xl ${className}`}>
    {children}
  </div>
);

const AmberButton = ({
  children,
  onClick,
  className = "",
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`${MONO} transform-gpu rounded border border-[#F5A623]/40 bg-[#0B0B0E] px-4 py-2 text-xs text-[#F5A623] transition-all duration-200 hover:border-[#F5A623] hover:bg-[#F5A623] hover:text-[#070709] hover:shadow-[0_0_24px_rgba(245,166,35,0.45)] active:scale-95 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F5A623] ${className}`}
  >
    {children}
  </button>
);

/* ────────────────── 10 INTERACTIVE WIDGETS ────────────────── */

function TelemetryWidget() {
  const [index, setIndex] = useState(0);
  const metrics = useMemo(
    () => [
      { k: "GPU PIPELINE", v: "WEBGL2 / HARDWARE ACCELERATED", pct: 94 },
      { k: "STORAGE ENGINE", v: "INDEXEDDB · CLIENT ZERO-CLOUD", pct: 42 },
      { k: "FRAME GUARD", v: "24.0 FPS LOCKED · 0ms LATENCY", pct: 100 },
    ],
    []
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((curr) => (curr + 1) % metrics.length);
    }, 1800);
    return () => window.clearInterval(timer);
  }, [metrics.length]);

  const active = metrics[index];

  return (
    <Panel className="w-full max-w-md">
      <div className="mb-3 flex items-center justify-between border-b border-[#23232D] pb-2">
        <span className={`${MONO} text-[10px] text-zinc-500`}>SYSTEM TELEMETRY</span>
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          ACTIVE PROBE
        </span>
      </div>
      <div className="my-2">
        <div className={`${MONO} text-[10px] text-zinc-500`}>{active.k}</div>
        <div className={`${MONO} mt-1 text-sm font-semibold text-zinc-100`}>{active.v}</div>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded bg-[#23232D]">
        <div
          className="h-full bg-gradient-to-r from-[#B45309] to-[#F5A623] transition-all duration-500"
          style={{ width: `${active.pct}%` }}
        />
      </div>
      <div className="mt-3 flex gap-1.5">
        {metrics.map((_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded transition-colors ${i === index ? "bg-[#F5A623]" : "bg-[#23232D]"}`}
          />
        ))}
      </div>
    </Panel>
  );
}

function VibeWidget() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<"KEEP" | "KILL" | null>(null);

  useEffect(() => {
    if (!running) return;
    const t0 = performance.now();
    const interval = window.setInterval(() => {
      const current = Math.min(3, (performance.now() - t0) / 1000);
      setElapsed(current);
      if (current >= 3) {
        window.clearInterval(interval);
        setRunning(false);
        setResult(Math.random() > 0.35 ? "KEEP" : "KILL");
      }
    }, 40);
    return () => window.clearInterval(interval);
  }, [running]);

  const start = () => {
    setElapsed(0);
    setResult(null);
    setRunning(true);
  };

  return (
    <Panel className="w-full max-w-md">
      <div className="mb-3 flex items-center justify-between">
        <span className={`${MONO} text-[10px] text-[#F5A623]/80`}>SHOT AUDITION</span>
        <span className={`${MONO} text-xs tabular-nums text-zinc-400`}>
          {(3 - elapsed).toFixed(2)}s REMAINING
        </span>
      </div>
      <div className="relative mb-4 flex h-24 items-center justify-center overflow-hidden rounded border border-[#23232D] bg-[#070709]">
        <div
          className="absolute inset-y-0 left-0 bg-[#F5A623]/15 transition-[width] duration-75"
          style={{ width: `${(elapsed / 3) * 100}%` }}
        />
        <div className={`${MONO} relative z-10 text-xs tracking-wider text-zinc-300`}>
          {running ? "AUDITIONING SIGNAL…" : result ? `VERDICT: ${result}` : "DROP SHOT HERE"}
        </div>
      </div>
      <AmberButton className="w-full" disabled={running} onClick={start}>
        {running ? "TESTING 3-SECOND IMPULSE…" : "RUN VIBE CHECK"}
      </AmberButton>
    </Panel>
  );
}

function MeterWidget() {
  const [frame, setFrame] = useState(0);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      setFrame((prev) => (prev + 1) % 289);
    }, 1000 / 24);
    return () => window.clearInterval(interval);
  }, [running]);

  return (
    <Panel className="w-full max-w-md">
      <div className="mb-2 flex items-center justify-between">
        <span className={`${MONO} text-[10px] text-zinc-500`}>12.000s BLOCK</span>
        <span className={`${MONO} text-xs text-zinc-400`}>
          F {pad(frame, 3)} / 288
        </span>
      </div>
      <div className={`${MONO} my-2 text-3xl font-black text-[#F5A623] md:text-4xl`} style={GLOW_STYLE}>
        {frameToTimecode(frame)}
      </div>
      <div className="h-2 overflow-hidden rounded bg-[#23232D]">
        <div
          className="h-full bg-gradient-to-r from-[#B45309] via-[#F5A623] to-[#FFF2B2] transition-[width] duration-75"
          style={{ width: `${(frame / 288) * 100}%` }}
        />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className={`${MONO} text-[10px] text-zinc-500`}>24.0 FPS LOCKED</span>
        <AmberButton onClick={() => setRunning((prev) => !prev)}>
          {running ? "HOLD" : "ROLL"}
        </AmberButton>
      </div>
    </Panel>
  );
}

function PlaybackWidget() {
  const [mode, setMode] = useState<"ANIMATIC" | "SOLO SCRUB">("ANIMATIC");
  const [scrub, setScrub] = useState(36);
  const [slide, setSlide] = useState(1);

  useEffect(() => {
    if (mode !== "ANIMATIC") return;
    const interval = window.setInterval(() => {
      setSlide((s) => (s % 100) + 1);
    }, 100);
    return () => window.clearInterval(interval);
  }, [mode]);

  return (
    <Panel className="w-full max-w-md">
      <div className="mb-4 flex gap-2">
        {(["ANIMATIC", "SOLO SCRUB"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setMode(item)}
            className={`${MONO} flex-1 rounded border px-3 py-2 text-[10px] transition ${
              mode === item
                ? "border-[#F5A623] bg-[#F5A623]/15 text-[#F5A623]"
                : "border-[#23232D] text-zinc-500 hover:text-zinc-200"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      {mode === "ANIMATIC" ? (
        <div>
          <div className={`${MONO} text-lg text-[#F5A623]`}>
            SLIDE {pad(slide, 3)} <span className="text-zinc-600">/ 100</span>
          </div>
          <div className="mt-3 grid grid-cols-[repeat(25,minmax(0,1fr))] gap-[2px]">
            {Array.from({ length: 100 }, (_, i) => (
              <span
                key={i}
                className={`h-2 rounded-[1px] ${
                  i === slide - 1 ? "bg-[#F5A623]" : i < slide ? "bg-[#F5A623]/25" : "bg-[#23232D]"
                }`}
              />
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div className={`${MONO} text-lg text-[#F5A623]`}>{frameToTimecode(scrub * 4)}</div>
          <input
            type="range"
            min={0}
            max={71}
            value={scrub}
            onChange={(e) => setScrub(Number(e.target.value))}
            className="mt-3 w-full accent-[#F5A623]"
            aria-label="Frame Scrub"
          />
          <div className={`${MONO} mt-2 text-[10px] text-zinc-500`}>[ J ] REV · [ K ] PAUSE · [ L ] FWD</div>
        </div>
      )}
    </Panel>
  );
}

function ScopeWidget() {
  const [xPos, setXPos] = useState(50);

  return (
    <div
      className="relative aspect-[2.39/1] w-full max-w-lg cursor-crosshair overflow-hidden rounded border border-[#23232D] bg-[#070709]"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setXPos(((e.clientX - rect.left) / rect.width) * 100);
      }}
    >
      <div className="absolute inset-x-0 top-0 h-[12%] bg-[#0B0B0E]" />
      <div className="absolute inset-x-0 bottom-0 h-[12%] bg-[#0B0B0E]" />
      <div
        className="pointer-events-none absolute inset-y-0 w-1/3 -translate-x-1/2 transform-gpu"
        style={{
          left: `${xPos}%`,
          background:
            "linear-gradient(90deg, transparent, rgba(245,166,35,0.1) 40%, rgba(255,242,178,0.85) 50%, rgba(245,166,35,0.1) 60%, transparent)",
          boxShadow: "0 0 25px rgba(245,166,35,0.5)",
        }}
      />
      <div className={`${MONO} absolute bottom-3 left-4 text-[9px] text-[#F5A623]/70`}>SCOPE // 2.39:1</div>
      <div className={`${MONO} absolute bottom-3 right-4 text-[9px] text-zinc-600`}>HOVER TO SCAN FLARE</div>
    </div>
  );
}

function TypographyWidget() {
  const [bangla, setBangla] = useState("দৃষ্টি");
  const [english, setEnglish] = useState("THE SINGULARITY");

  return (
    <Panel className="w-full max-w-md">
      <div className="mb-4 text-center" style={GLOW_STYLE}>
        <div className={`text-4xl font-black ${GOLD_TEXT}`}>{bangla || " "}</div>
        <div className={`mt-1 text-xs font-bold tracking-[0.25em] ${GOLD_TEXT}`}>{english || " "}</div>
      </div>
      <div className="grid gap-2">
        <input
          value={bangla}
          onChange={(e) => setBangla(e.target.value)}
          placeholder="Bangla Headline"
          className="w-full rounded border border-[#23232D] bg-[#121217] px-3 py-2 text-xs text-zinc-100 outline-none focus:border-[#F5A623]"
        />
        <input
          value={english}
          onChange={(e) => setEnglish(e.target.value.toUpperCase())}
          placeholder="English Subtitle"
          className="w-full rounded border border-[#23232D] bg-[#121217] px-3 py-2 text-xs text-zinc-100 outline-none focus:border-[#F5A623]"
        />
      </div>
    </Panel>
  );
}

function AudioWidget() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let animId: number;
    let phase = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const bars = Math.floor(w / 4);
      for (let i = 0; i < bars; i++) {
        const x = i * 4;
        const wave = Math.sin(i * 0.15 + phase) * 0.45 + Math.cos(i * 0.05 - phase * 0.5) * 0.35;
        const barH = Math.max(3, Math.abs(wave) * (h * 0.85));
        const isTransient = i % 14 === 0;

        ctx.fillStyle = isTransient ? "#FFF2B2" : "rgba(245, 166, 35, 0.6)";
        ctx.fillRect(x, (h - barH) / 2, 2.5, barH);
      }
      phase += 0.05;
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <Panel className="w-full max-w-md">
      <div className="mb-2 flex items-center justify-between">
        <span className={`${MONO} text-[10px] text-zinc-500`}>TRANSIENT BEAT-DETECTOR</span>
        <span className={`${MONO} text-xs text-[#F5A623]`}>120 BPM LOCKED</span>
      </div>
      <canvas ref={canvasRef} className="h-24 w-full rounded bg-[#070709]" />
    </Panel>
  );
}

function SiliconWidget() {
  const [blocks, setBlocks] = useState(24);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setBlocks((b) => (b >= 50 ? 15 : b + 2));
    }, 600);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <Panel className="w-full max-w-md">
      <div className="mb-2 flex items-center justify-between">
        <span className={`${MONO} text-[10px] text-zinc-500`}>INDEXEDDB MEDIA POOL</span>
        <span className={`${MONO} text-xs text-emerald-400`}>SOVEREIGN 100%</span>
      </div>
      <div className="grid grid-cols-[repeat(25,minmax(0,1fr))] gap-1 py-2">
        {Array.from({ length: 50 }, (_, i) => (
          <span
            key={i}
            className={`aspect-square rounded-[1px] transition-colors duration-300 ${
              i < blocks ? "bg-[#F5A623] shadow-[0_0_6px_rgba(245,166,35,0.45)]" : "bg-[#23232D]"
            }`}
          />
        ))}
      </div>
      <div className={`${MONO} mt-2 text-[10px] text-zinc-500`}>
        {blocks * 48} MB ALLOCATED · 0 BYTES TRANSMITTED TO CLOUD
      </div>
    </Panel>
  );
}

function XmlWidget() {
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = () => {
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE xmeml>\n<xmeml version="4">\n  <sequence id="rawx-master-sequence">\n    <name>RAWx Director's Cut</name>\n    <duration>288</duration>\n    <rate><timebase>24</timebase><ntsc>FALSE</ntsc></rate>\n  </sequence>\n</xmeml>\n`;
    const blob = new Blob([xmlContent], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "rawx-sequence.xml";
    link.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    window.setTimeout(() => setDownloaded(false), 2000);
  };

  return (
    <Panel className="w-full max-w-md">
      <div className="mb-2 flex items-center justify-between">
        <span className={`${MONO} text-[10px] text-zinc-500`}>NLE TIMELINE PIPELINE</span>
        <span className={`${MONO} text-xs text-zinc-400`}>FCP 7 / PREMIERE / CAPCUT</span>
      </div>
      <div className="my-3 rounded border border-[#23232D] bg-[#070709] p-3 font-mono text-xs text-zinc-300">
        <div>FORMAT: Final Cut Pro 7 XML (.xml)</div>
        <div>TIMEBASE: 24 FPS · 12.0s SLIDE SYNC</div>
      </div>
      <AmberButton className="w-full" onClick={handleDownload}>
        {downloaded ? "✓ SAMPLE XML EXPORTED" : "GENERATE NLE XML"}
      </AmberButton>
    </Panel>
  );
}

function LaunchWidget({ onLaunch }: { onLaunch: () => void }) {
  return (
    <div className="flex w-full max-w-md flex-col items-start gap-4">
      <button
        type="button"
        onClick={onLaunch}
        className={`${MONO} group relative w-full transform-gpu overflow-hidden rounded border border-[#F5A623] bg-[#F5A623] px-6 py-4 text-sm font-bold text-[#070709] shadow-[0_0_35px_rgba(245,166,35,0.45)] transition-all duration-200 hover:scale-[1.02] active:scale-95 cursor-pointer`}
      >
        <span className="relative z-10">ENTER DIRECTOR'S STUDIO ↗</span>
      </button>
      <div className={`${MONO} text-[10px] text-zinc-500`}>
        NO SERVER SUBSCRIPTION · 100% LOCAL SILICON ACCELERATED
      </div>
    </div>
  );
}

/* ────────────────── MAIN WALKTHROUGH CONTROLLER ────────────────── */

export function LandingWalkthrough({ onLaunchStudio }: LandingWalkthroughProps) {
  const [index, setIndex] = useState(0);
  const total = SLIDES_DATA.length;
  const activeSlide = SLIDES_DATA[index];

  const next = useCallback(() => {
    if (index >= total - 1) onLaunchStudio();
    else setIndex((i) => i + 1);
  }, [index, total, onLaunchStudio]);

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";
      if (e.key === "Escape") {
        e.preventDefault();
        onLaunchStudio();
        return;
      }
      if (isInput) return;
      if (e.key === "ArrowRight" || e.key === " " || e.code === "Space") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [next, prev, onLaunchStudio]);

  const renderActiveWidget = () => {
    switch (activeSlide.widget) {
      case "telemetry":
        return <TelemetryWidget />;
      case "vibe":
        return <VibeWidget />;
      case "meter":
        return <MeterWidget />;
      case "playback":
        return <PlaybackWidget />;
      case "scope":
        return <ScopeWidget />;
      case "type":
        return <TypographyWidget />;
      case "audio":
        return <AudioWidget />;
      case "silicon":
        return <SiliconWidget />;
      case "xml":
        return <XmlWidget />;
      case "launch":
        return <LaunchWidget onLaunch={onLaunchStudio} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex select-none flex-col justify-between overflow-hidden bg-[#070709] p-6 font-sans text-zinc-100 md:p-10 animate-in fade-in duration-200">
      {/* Background Ambience */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/4 h-[50vh] w-[70vw] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(245,166,35,0.3), transparent 70%)" }}
      />

      {/* Top Header */}
      <header className="relative z-10 flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center border border-[#F5A623]/40 bg-[#F5A623]/10 font-mono text-xs font-bold text-[#F5A623]">
            R×
          </div>
          <div>
            <div className={`${MONO} text-xs font-bold text-[#F5A623]`}>
              RAWx <span className="text-zinc-600">//</span> DIRECTOR'S MANIFESTO
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onLaunchStudio}
          className={`${MONO} flex items-center gap-2 text-xs text-zinc-400 transition hover:text-[#F5A623] cursor-pointer`}
        >
          <kbd className="rounded border border-[#23232D] bg-[#121217] px-1.5 py-0.5 text-[10px]">ESC</kbd>
          SKIP TO STUDIO
        </button>
      </header>

      {/* Central 2.39:1 Presentation Stage */}
      <main className="relative z-10 flex min-h-0 flex-1 items-center justify-center py-4">
        <div className="relative flex w-full max-w-6xl flex-col items-center justify-between gap-6 overflow-hidden rounded-lg border border-[#23232D] bg-[#0B0B0E]/80 p-6 md:aspect-[2.39/1] md:flex-row md:gap-12 md:p-12">
          {/* Left Text Column */}
          <div className="flex-1 min-w-0">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-px w-6 bg-[#F5A623]/70" />
              <span className={`${MONO} text-[10px] text-[#F5A623]`}>{activeSlide.tag}</span>
            </div>
            <h1 className={`text-3xl font-black leading-tight md:text-5xl lg:text-6xl ${GOLD_TEXT}`} style={GLOW_STYLE}>
              {activeSlide.title}
            </h1>
            <h2 className="mt-3 text-sm font-semibold tracking-wide text-zinc-200 md:text-base">
              {activeSlide.subtitle}
            </h2>
            <p className="mt-3 max-w-md text-xs leading-relaxed text-zinc-400 md:text-sm">
              {activeSlide.body}
            </p>
          </div>

          {/* Right Interactive Column */}
          <div className="flex w-full flex-1 items-center justify-center md:max-w-md">
            {renderActiveWidget()}
          </div>
        </div>
      </main>

      {/* Bottom Navigation Dock */}
      <footer className="relative z-10 flex shrink-0 flex-col items-center gap-3">
        <nav className="flex items-center gap-3" aria-label="Slides">
          <AmberButton disabled={index === 0} onClick={prev}>
            &lt; PREV
          </AmberButton>
          <div className="flex items-center gap-1 rounded-md border border-[#23232D] bg-[#121217] px-2 py-1 px-2! py-1!">
            {SLIDES_DATA.map((s, i) => {
              const markerLabel = pad(i + 1, 2);
              const isCurrent = i === index;
              return (
                <div key={s.id} className="relative group/wmarker flex items-center">
                  <button
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`Jump to Slide ${markerLabel}: ${s.title}`}
                    aria-current={isCurrent}
                    className={`${MONO} px-2 py-1 px-2! py-1! rounded-[3px] text-[10px] tabular-nums transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#F5A623] ${
                      isCurrent
                        ? "bg-[#F5A623] text-black font-bold shadow-[0_0_8px_rgba(245,166,35,0.65)]"
                        : "text-zinc-400 hover:bg-white/10 hover:text-[#FFE066]"
                    }`}
                  >
                    {markerLabel}
                  </button>

                  {/* Floating Thumbnail Popup */}
                  <div
                    role="tooltip"
                    className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2.5 w-44 bg-[#090A10]/95 backdrop-blur-xl border border-[#F5A623]/50 rounded-[4px] p-1.5 p-1.5! shadow-[0_16px_40px_rgba(0,0,0,0.95)] opacity-0 translate-y-1 pointer-events-none group-hover/wmarker:opacity-100 group-hover/wmarker:translate-y-0 group-focus-within/wmarker:opacity-100 group-focus-within/wmarker:translate-y-0 transition-all duration-150 z-50 text-left transform-gpu"
                  >
                    <div className="relative w-full aspect-[16/9] rounded-[2px] overflow-hidden bg-[#050508] border border-white/10">
                      <img
                        src={s.backgroundImage}
                        alt={s.imageAlt || s.title}
                        referrerPolicy="no-referrer"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-black/90 to-transparent flex items-end justify-between px-1.5 px-1.5! pb-0.5 pb-0.5! font-mono text-[8px] tabular-nums">
                        <span className="font-bold text-[#FFE066]">#{markerLabel}</span>
                        <span className="text-zinc-300">{s.aspectRatio}</span>
                      </div>
                    </div>
                    <div className="pt-1.5 pt-1.5! px-0.5 px-0.5! text-[9.5px] font-semibold text-white truncate">
                      {s.title}
                    </div>
                    <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 rotate-45 bg-[#090A10] border-r border-b border-[#F5A623]/50" />
                  </div>
                </div>
              );
            })}
          </div>
          <AmberButton onClick={next}>
            {index === total - 1 ? "LAUNCH >" : "NEXT >"}
          </AmberButton>
        </nav>
        <div className={`${MONO} text-[10px] text-zinc-500`}>
          SLIDE {pad(index + 1)} / {pad(total)} · [ ← / → ] NAVIGATE · [ ESC ] SKIP
        </div>
      </footer>
    </div>
  );
}

export default LandingWalkthrough;
