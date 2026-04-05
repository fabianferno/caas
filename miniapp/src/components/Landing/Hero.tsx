"use client";

import { ArrowRight } from "lucide-react";
import gsap from "gsap";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { walletAuth } from "@/auth/wallet";

const MetallicPaint = dynamic(() => import("@/components/MetallicPaint"), {
  ssr: false,
  loading: () => null,
});

export default function Hero() {
  const containerRef = useRef<HTMLElement>(null);
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isPending, setIsPending] = useState(false);

  const handleLogin = useCallback(async () => {
    if (isPending) return;
    if (session) { router.push('/home'); return; }
    setIsPending(true);
    try {
      await walletAuth();
    } catch (e) {
      console.error('Login error', e);
    } finally {
      setIsPending(false);
    }
  }, [isPending, session, router]);

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
      <div className="h-robot flex-1 min-h-0" style={{ minHeight: 260 }}>
        <MetallicPaint
          imageSrc="/caas-logo-metallic.svg"
          seed={14}
          scale={2.8}
          speed={0.55}
          liquid={0.92}
          brightness={2.6}
          contrast={0.38}
          refraction={0.018}
          blur={0.008}
          fresnel={1.6}
          chromaticSpread={4.5}
          waveAmplitude={1.5}
          noiseScale={0.35}
          patternSharpness={0.85}
          distortion={1.3}
          contour={0.08}
          lightColor="#e8eeff"
          darkColor="#1a2d5a"
          tintColor="#a5b8ff"
          mouseAnimation={false}
        />
      </div>

      {/* Bottom block — stat cards + CTA */}
      <div className="shrink-0 px-5 pb-8">

        {/* 3 stat cards */}
        {/* <div className="h-cards grid grid-cols-3 gap-3 mb-4">

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
            <p className="font-coolvetica text-[1.15rem] leading-tight" style={{ color: "#31456a" }}>One Click</p>
              <p className="text-[10px] uppercase tracking-wide mt-0.5" style={{ color: "#8a9bb0" }}>Deploy</p>
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

        </div> */}

        {/* CTA */}
        <button
          onClick={handleLogin}
          disabled={isPending || status === 'loading'}
          className="h-cta w-full inline-flex items-center justify-center gap-2.5 font-bold py-4 rounded-2xl text-[15px] active:scale-[0.98] transition-transform disabled:opacity-60"
          style={{ background: '#7b96f5', boxShadow: '6px 6px 16px rgba(80,100,190,0.55), -4px -4px 12px rgba(255,255,255,0.95)', color: '#ffffff' }}
        >
          {isPending ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Signing in...
            </>
          ) : session ? (
            <>Open App <ArrowRight size={16} /></>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0">
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 2a8 8 0 110 16A8 8 0 0112 4zm0 2a6 6 0 100 12A6 6 0 0012 6zm0 2a4 4 0 110 8 4 4 0 010-8z"/>
              </svg>
              Sign in with World ID
            </>
          )}
        </button>

      </div>
    </section>
  );
}
