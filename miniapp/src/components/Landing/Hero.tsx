"use client";

import { ArrowRight, Globe, Zap, ShieldCheck } from "lucide-react";
import gsap from "gsap";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";

const MetallicPaint = dynamic(() => import("@/components/MetallicPaint"), {
  ssr: false,
  loading: () => null,
});

export default function Hero() {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.1 });
      tl.from(".h-logo", { opacity: 0, duration: 0.4 })
        .from(".h-line", { y: "110%", duration: 0.72, stagger: 0.09, ease: "power3.out" }, "-=0.1")
        .from(".h-sub", { opacity: 0, y: 10, duration: 0.45 }, "-=0.4")
        .from(".h-robot", { opacity: 0, duration: 0.5 }, "-=0.2")
        .from(".h-cards", { opacity: 0, y: 18, duration: 0.5 }, "-=0.25")
        .from(".h-cta", { opacity: 0, y: 12, duration: 0.4 }, "-=0.2");
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="flex flex-col min-h-dvh"
      style={{ background: "#e0e5ec" }}
    >
      {/* Navbar */}
      <div className="h-logo flex items-center justify-between px-5 pt-6 pb-3 shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center overflow-hidden"
            style={{
              background: "#7b96f5",
              boxShadow: "4px 4px 10px #b3b7bd, -2px -2px 8px rgba(255,255,255,0.5)",
            }}
          >
            <img src="/logo.svg" alt="CaaS" className="w-[22px] h-[22px] invert" />
          </div>
          <span className="font-coolvetica text-[1.65rem] uppercase tracking-tight leading-none" style={{ color: "#31456a" }}>
            CaaS
          </span>
        </div>
        <span
          className="text-[10px] uppercase tracking-[0.18em] px-3 py-1 rounded-full"
          style={{
            color: "#8a9bb0",
            background: "#e0e5ec",
            boxShadow: "inset 2px 2px 5px #b3b7bd, inset -2px -2px 5px rgba(255,255,255,0.85)",
          }}
        >
          Beta
        </span>
      </div>

      {/* Headline */}
      <div className="px-5 pt-2 shrink-0">
        <p className="h-sub text-[11px] font-bold uppercase tracking-[0.22em] mb-2 gradient-text">
          Agents as a Service
        </p>
        <h1
          className="font-coolvetica uppercase"
          style={{ fontSize: "clamp(3.6rem,18vw,5.8rem)", lineHeight: 0.84, color: "#31456a" }}
        >
          <span className="block overflow-hidden"><span className="h-line block">DEPLOY</span></span>
          <span className="block overflow-hidden"><span className="h-line block">YOUR</span></span>
          <span className="block overflow-hidden"><span className="h-line block gradient-text">AGENT.</span></span>
        </h1>
      </div>

      {/* Metallic logo — fills available space between headline and cards */}
      <div className="h-robot flex-1 min-h-0 flex items-center justify-center" style={{ minHeight: 220 }}>
        <MetallicPaint
          imageSrc="/caas-logo-metallic.svg"
          seed={7}
          scale={3.5}
          speed={0.25}
          liquid={0.85}
          brightness={2.2}
          contrast={0.45}
          refraction={0.012}
          blur={0.01}
          fresnel={1.2}
          chromaticSpread={2.5}
          waveAmplitude={0.9}
          noiseScale={0.45}
          patternSharpness={1.1}
          distortion={0.8}
          contour={0.15}
          lightColor="#ffffff"
          darkColor="#31456a"
          tintColor="#7b96f5"
          mouseAnimation={false}
        />
      </div>

      {/* Bottom block — stat cards + CTA */}
      <div className="shrink-0 px-5 pb-8">

        {/* 3 stat cards */}
        <div className="h-cards grid grid-cols-3 gap-3 mb-4">

          <div
            className="rounded-2xl p-3.5 flex flex-col justify-between"
            style={{
              background: "#e0e5ec",
              boxShadow: "6px 6px 16px #b3b7bd, -6px -6px 16px rgba(255,255,255,0.5)",
              minHeight: 104,
            }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ boxShadow: "inset 2px 2px 5px #b3b7bd, inset -2px -2px 5px rgba(255,255,255,0.85)" }}
            >
              <Globe size={15} style={{ color: "#7b96f5" }} />
            </div>
            <div>
              <p className="font-coolvetica text-[1.55rem] leading-none" style={{ color: "#31456a" }}>38M+</p>
              <p className="text-[10px] uppercase tracking-wide mt-0.5" style={{ color: "#8a9bb0" }}>Users</p>
            </div>
          </div>

          <div
            className="rounded-2xl p-3.5 flex flex-col justify-between"
            style={{
              background: "#e0e5ec",
              boxShadow: "6px 6px 16px #b3b7bd, -6px -6px 16px rgba(255,255,255,0.5)",
              minHeight: 104,
            }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ boxShadow: "inset 2px 2px 5px #b3b7bd, inset -2px -2px 5px rgba(255,255,255,0.85)" }}
            >
              <Zap size={15} style={{ color: "#6dd5d9" }} />
            </div>
            <div>
              <p className="font-coolvetica text-[1.15rem] leading-tight" style={{ color: "#31456a" }}>x402</p>
              <p className="text-[10px] uppercase tracking-wide mt-0.5" style={{ color: "#8a9bb0" }}>Protocol</p>
            </div>
          </div>

          <div
            className="rounded-2xl p-3.5 flex flex-col justify-between"
            style={{
              background: "#e0e5ec",
              boxShadow: "6px 6px 16px #b3b7bd, -6px -6px 16px rgba(255,255,255,0.5)",
              minHeight: 104,
            }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ boxShadow: "inset 2px 2px 5px #b3b7bd, inset -2px -2px 5px rgba(255,255,255,0.85)" }}
            >
              <ShieldCheck size={15} style={{ color: "#7b96f5" }} />
            </div>
            <div>
              <p className="font-coolvetica text-[1.15rem] leading-tight" style={{ color: "#31456a" }}>World</p>
              <p className="text-[10px] uppercase tracking-wide mt-0.5" style={{ color: "#8a9bb0" }}>Verified</p>
            </div>
          </div>

        </div>

        {/* CTA */}
        <Link
          href="/create"
          className="h-cta group w-full inline-flex items-center justify-center gap-2 font-bold py-4 rounded-2xl text-[15px] active:scale-[0.98] transition-transform text-white nm-btn-accent"
        >
          Create Your Claw
          <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>

      </div>
    </section>
  );
}
