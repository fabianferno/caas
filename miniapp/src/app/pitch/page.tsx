"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const BG = "#e0e5ec";
const ACCENT = "#7b96f5";
const ACCENT_2 = "#6dd5d9";
const FG = "#31456a";
const MUTED = "#8a9bb0";
const DARK_SHADOW = "#b3b7bd";
const LIGHT_SHADOW = "rgba(255,255,255,0.8)";
const TOTAL_SLIDES = 6;

// -- Neumorphic shadow helpers --
const nmRaised = `6px 6px 16px ${DARK_SHADOW}, -6px -6px 16px ${LIGHT_SHADOW}`;
const nmRaisedSm = `4px 4px 12px ${DARK_SHADOW}, -4px -4px 12px ${LIGHT_SHADOW}`;
const nmInset = `inset 5px 5px 14px ${DARK_SHADOW}, inset -5px -5px 14px ${LIGHT_SHADOW}`;

// -- Animation variants --
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fadeUp: any = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: "easeOut" },
  }),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const scaleIn: any = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.15, duration: 0.5, ease: "easeOut" },
  }),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const slideFromLeft: any = {
  hidden: { opacity: 0, x: -60 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

// -- Slide wrapper with intersection observer --
function Slide({
  children,
  index,
  onVisible,
}: {
  children: React.ReactNode;
  index: number;
  onVisible: (i: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          onVisible(index);
        }
      },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [index, onVisible]);

  return (
    <div
      ref={ref}
      className="h-screen w-full flex items-center justify-center"
      style={{ scrollSnapAlign: "start", minHeight: "100dvh", background: BG }}
    >
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial="hidden"
            animate="visible"
            className="w-full max-w-[1100px] mx-auto px-6 md:px-20"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// SLIDES
// ============================================================

function TitleSlide() {
  return (
    <div className="text-center flex flex-col items-center gap-6">
      <motion.div
        custom={0}
        variants={scaleIn}
        className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-2"
        style={{ background: BG, boxShadow: nmRaised }}
      >
        <span className="font-heading" style={{ color: ACCENT }}>C</span>
      </motion.div>

      <motion.h1
        custom={1}
        variants={fadeUp}
        className="text-5xl md:text-7xl font-heading tracking-tight"
        style={{ color: FG }}
      >
        CaaS
      </motion.h1>

      <motion.p
        custom={2}
        variants={fadeUp}
        className="text-lg md:text-2xl max-w-xl"
        style={{ color: MUTED }}
      >
        Spin up autonomous AI agents.{" "}
        <span style={{ color: ACCENT }}>Pay with World.</span>
      </motion.p>

      <motion.div custom={3} variants={fadeUp} className="flex flex-wrap gap-3 mt-2 justify-center">
        {["World Mini App", "ENS Identity", "x402 Payments", "Multi-Channel"].map(
          (tag) => (
            <span
              key={tag}
              className="px-3 py-1 rounded-full text-xs font-mono"
              style={{
                background: BG,
                boxShadow: nmRaisedSm,
                color: MUTED,
              }}
            >
              {tag}
            </span>
          )
        )}
      </motion.div>

      <motion.div
        custom={4}
        variants={fadeUp}
        className="mt-12 animate-bounce"
        style={{ color: MUTED }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </motion.div>
    </div>
  );
}

function ProblemSlide() {
  const problems = [
    { icon: "brain", label: "LLM Provider", desc: "OpenAI, Anthropic, or self-hosted" },
    { icon: "chat", label: "Messaging APIs", desc: "WhatsApp, Telegram, Discord SDKs" },
    { icon: "wallet", label: "Payment System", desc: "Stripe, crypto wallets, billing" },
    { icon: "shield", label: "Identity Layer", desc: "Auth, verification, anti-spam" },
    { icon: "database", label: "Storage", desc: "Memory, conversation history, config" },
    { icon: "server", label: "Hosting Infra", desc: "Servers, scaling, monitoring" },
  ];

  const icons: Record<string, React.ReactNode> = {
    brain: <path d="M12 2a7 7 0 0 1 7 7c0 2.4-1.2 4.5-3 5.7V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.3C6.2 13.5 5 11.4 5 9a7 7 0 0 1 7-7z" />,
    chat: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></>,
    wallet: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M16 12h.01" /></>,
    shield: <path d="M12 2l7 4v5c0 5-3.5 9.7-7 11-3.5-1.3-7-6-7-11V6l7-4z" />,
    database: <><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5" /><path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3" /></>,
    server: <><rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" /><circle cx="7" cy="6" r="1" /><circle cx="7" cy="18" r="1" /></>,
  };

  return (
    <div className="text-left">
      <motion.p
        custom={0}
        variants={fadeUp}
        className="text-sm font-mono tracking-widest uppercase mb-4"
        style={{ color: ACCENT }}
      >
        01 -- The Problem
      </motion.p>

      <motion.h2
        custom={1}
        variants={fadeUp}
        className="text-4xl md:text-5xl font-heading mb-3"
        style={{ color: FG }}
      >
        Deploying an AI agent is{" "}
        <span style={{ color: "#ef4444" }}>painful</span>
      </motion.h2>

      <motion.p
        custom={2}
        variants={fadeUp}
        className="text-base mb-10"
        style={{ color: MUTED }}
      >
        Today you need 6+ separate services stitched together just to get a bot running.
      </motion.p>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 md:grid-cols-3 gap-4"
      >
        {problems.map((p, i) => (
          <motion.div
            key={p.label}
            custom={i + 3}
            variants={scaleIn}
            className="rounded-2xl p-5 flex flex-col gap-2"
            style={{
              background: BG,
              boxShadow: nmRaised,
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ef4444"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ opacity: 0.7 }}
            >
              {icons[p.icon]}
            </svg>
            <span className="text-sm font-medium" style={{ color: FG }}>{p.label}</span>
            <span className="text-xs" style={{ color: MUTED }}>
              {p.desc}
            </span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

function SolutionSlide() {
  const stats = [
    { value: "5 min", label: "Deploy time" },
    { value: "4+", label: "Channels" },
    { value: "1", label: "Token (WLD)" },
  ];

  return (
    <div className="text-left">
      <motion.p
        custom={0}
        variants={fadeUp}
        className="text-sm font-mono tracking-widest uppercase mb-4"
        style={{ color: ACCENT }}
      >
        02 -- The Solution
      </motion.p>

      <motion.h2
        custom={1}
        variants={fadeUp}
        className="text-4xl md:text-5xl font-heading mb-4"
        style={{ color: FG }}
      >
        One platform.{" "}
        <span style={{ color: ACCENT }}>Human-verified agents.</span>
      </motion.h2>

      <motion.p
        custom={2}
        variants={fadeUp}
        className="text-base max-w-2xl mb-8"
        style={{ color: MUTED }}
      >
        CaaS lets any verified human deploy a fully autonomous AI agent across
        WhatsApp, Telegram, web, and x402 APIs -- funded entirely with WLD.
        No external services. No devops. No stitching.
      </motion.p>

      <motion.div
        custom={3}
        variants={fadeUp}
        className="rounded-2xl p-6 mb-8"
        style={{
          background: BG,
          boxShadow: nmInset,
        }}
      >
        <p className="text-lg italic" style={{ color: MUTED }}>
          &quot;Any verified human can deploy a fully-functional AI agent in under
          5 minutes that can think, remember, transact, and operate
          autonomously.&quot;
        </p>
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-3 gap-4"
      >
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            custom={i + 4}
            variants={scaleIn}
            className="rounded-2xl p-5 text-center"
            style={{
              background: BG,
              boxShadow: nmRaised,
            }}
          >
            <p className="text-3xl md:text-4xl font-heading" style={{ color: ACCENT }}>
              {s.value}
            </p>
            <p className="text-xs mt-1" style={{ color: MUTED }}>
              {s.label}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

function HowItWorksSlide() {
  const steps = [
    { num: "01", title: "Verify", desc: "Prove you are human with World ID" },
    { num: "02", title: "Name", desc: "Claim an ENS subname (agent.caas.eth)" },
    { num: "03", title: "Configure", desc: "Set personality, skills, channels" },
    { num: "04", title: "Fund", desc: "Deposit WLD for agent operations" },
    { num: "05", title: "Deploy", desc: "Live on WhatsApp, Telegram, web, x402" },
  ];

  return (
    <div className="text-left">
      <motion.p
        custom={0}
        variants={fadeUp}
        className="text-sm font-mono tracking-widest uppercase mb-4"
        style={{ color: ACCENT }}
      >
        03 -- How It Works
      </motion.p>

      <motion.h2
        custom={1}
        variants={fadeUp}
        className="text-4xl md:text-5xl font-heading mb-10"
        style={{ color: FG }}
      >
        Five steps to a live agent
      </motion.h2>

      <div className="space-y-4">
        {steps.map((step, i) => (
          <motion.div
            key={step.num}
            custom={i + 2}
            variants={slideFromLeft}
            className="flex items-center gap-5 rounded-2xl p-5"
            style={{
              background: BG,
              boxShadow: nmRaisedSm,
              transition: "box-shadow 0.2s ease",
            }}
            whileHover={{
              boxShadow: `8px 8px 20px ${DARK_SHADOW}, -8px -8px 20px ${LIGHT_SHADOW}`,
              transition: { duration: 0.2 },
            }}
          >
            <span
              className="text-sm font-mono shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: BG, boxShadow: nmInset, color: ACCENT }}
            >
              {step.num}
            </span>
            <div>
              <p className="font-medium" style={{ color: FG }}>{step.title}</p>
              <p className="text-xs mt-0.5" style={{ color: MUTED }}>
                {step.desc}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function TechSlide() {
  const techs = [
    {
      title: "World ID",
      desc: "Sybil-resistant human verification for every agent creator",
      tags: ["Proof of Personhood", "Wallet Auth"],
      primary: false,
    },
    {
      title: "ENS Identity",
      desc: "On-chain agent names with ENSIP-5 text records for personality and config",
      tags: ["Subnames", "Soul Records"],
      primary: true,
    },
    {
      title: "0G Network",
      desc: "Decentralized compute for LLM inference and immutable agent memory storage",
      tags: ["Storage", "Compute", "ERC-7857"],
      primary: false,
    },
    {
      title: "x402 Protocol",
      desc: "Autonomous micropayments so agents can pay for APIs without human intervention",
      tags: ["Linux Foundation", "AgentKit"],
      primary: false,
    },
  ];

  return (
    <div className="text-left">
      <motion.p
        custom={0}
        variants={fadeUp}
        className="text-sm font-mono tracking-widest uppercase mb-4"
        style={{ color: ACCENT }}
      >
        04 -- Tech Stack
      </motion.p>

      <motion.h2
        custom={1}
        variants={fadeUp}
        className="text-4xl md:text-5xl font-heading mb-10"
        style={{ color: FG }}
      >
        Built on <span style={{ color: ACCENT_2 }}>composable</span> primitives
      </motion.h2>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {techs.map((t, i) => (
          <motion.div
            key={t.title}
            custom={i + 2}
            variants={scaleIn}
            className="rounded-2xl p-6"
            style={{
              background: BG,
              boxShadow: t.primary
                ? `6px 6px 16px ${DARK_SHADOW}, -6px -6px 16px ${LIGHT_SHADOW}, inset 0 0 0 2px ${ACCENT}40`
                : nmRaised,
            }}
          >
            <p className="font-medium text-lg mb-1" style={{ color: FG }}>{t.title}</p>
            <p className="text-sm mb-3" style={{ color: MUTED }}>
              {t.desc}
            </p>
            <div className="flex flex-wrap gap-2">
              {t.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full text-xs font-mono"
                  style={{
                    background: BG,
                    boxShadow: nmInset,
                    color: MUTED,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

function CTASlide() {
  const differentiators = [
    "Human-backed agents (World ID)",
    "Portable on-chain identity (ENS)",
    "Decentralized memory (0G Storage)",
    "Autonomous payments (x402)",
    "Intelligent NFTs (ERC-7857)",
    "Multi-channel by default",
  ];

  return (
    <div className="text-center flex flex-col items-center gap-6">
      <motion.p
        custom={0}
        variants={fadeUp}
        className="text-sm font-mono tracking-widest uppercase"
        style={{ color: ACCENT }}
      >
        05 -- Why CaaS
      </motion.p>

      <motion.h2
        custom={1}
        variants={fadeUp}
        className="text-4xl md:text-6xl font-heading"
        style={{ color: FG }}
      >
        The future of agents is{" "}
        <span style={{ color: ACCENT }}>human-verified</span>
      </motion.h2>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-6 text-left w-full max-w-3xl"
      >
        {differentiators.map((d, i) => (
          <motion.div
            key={d}
            custom={i + 2}
            variants={scaleIn}
            className="flex items-start gap-2 rounded-xl p-3"
            style={{
              background: BG,
              boxShadow: nmRaisedSm,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={ACCENT}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 shrink-0"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span className="text-xs md:text-sm" style={{ color: MUTED }}>
              {d}
            </span>
          </motion.div>
        ))}
      </motion.div>

      <motion.div custom={8} variants={fadeUp} className="mt-8 flex flex-col items-center gap-3">
        <p className="text-sm font-mono" style={{ color: MUTED }}>
          Built for the World ecosystem
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {["World", "0G", "ENS", "Chainlink", "Coinbase"].map((sponsor) => (
            <span
              key={sponsor}
              className="px-3 py-1 rounded-full text-xs font-mono"
              style={{
                background: BG,
                boxShadow: nmRaisedSm,
                color: ACCENT,
              }}
            >
              {sponsor}
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function PitchPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const isScrolling = useRef(false);

  const handleVisible = useCallback((i: number) => {
    if (!isScrolling.current) {
      setCurrentSlide(i);
    }
  }, []);

  const scrollTo = useCallback((index: number) => {
    const container = containerRef.current;
    if (!container) return;
    const target = container.children[index] as HTMLElement;
    if (!target) return;
    isScrolling.current = true;
    target.scrollIntoView({ behavior: "smooth" });
    setCurrentSlide(index);
    setTimeout(() => {
      isScrolling.current = false;
    }, 800);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        if (currentSlide < TOTAL_SLIDES - 1) scrollTo(currentSlide + 1);
      }
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        if (currentSlide > 0) scrollTo(currentSlide - 1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentSlide, scrollTo]);

  const slides = [
    <TitleSlide key="title" />,
    <ProblemSlide key="problem" />,
    <SolutionSlide key="solution" />,
    <HowItWorksSlide key="how" />,
    <TechSlide key="tech" />,
    <CTASlide key="cta" />,
  ];

  return (
    <div
      className="relative min-h-screen"
      style={{ background: BG, color: FG }}
    >
      {/* Slide counter - bottom right */}
      <div
        className="fixed bottom-6 right-6 z-50 text-xs font-mono select-none"
        style={{ color: MUTED }}
      >
        {String(currentSlide + 1).padStart(2, "0")} / {String(TOTAL_SLIDES).padStart(2, "0")}
      </div>

      {/* Dot navigation - right edge */}
      <div className="fixed right-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2">
        {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
          <button
            key={i}
            onClick={() => scrollTo(i)}
            className="transition-all duration-300"
            style={{
              width: 8,
              height: currentSlide === i ? 28 : 8,
              borderRadius: 4,
              background: currentSlide === i ? ACCENT : DARK_SHADOW,
              boxShadow: currentSlide === i ? nmRaisedSm : "none",
            }}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Arrow navigation */}
      {currentSlide > 0 && (
        <button
          onClick={() => scrollTo(currentSlide - 1)}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 p-2 rounded-full transition-all"
          style={{ background: BG, boxShadow: nmRaisedSm }}
          aria-label="Previous slide"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2">
            <path d="M18 15l-6-6-6 6" />
          </svg>
        </button>
      )}
      {currentSlide < TOTAL_SLIDES - 1 && (
        <button
          onClick={() => scrollTo(currentSlide + 1)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 p-2 rounded-full transition-all"
          style={{ background: BG, boxShadow: nmRaisedSm }}
          aria-label="Next slide"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      )}

      {/* Keyboard hint */}
      <div
        className="fixed bottom-6 left-6 z-50 text-xs font-mono select-none hidden md:block"
        style={{ color: MUTED }}
      >
        arrows / space to navigate
      </div>

      {/* Scroll container */}
      <div
        ref={containerRef}
        className="h-screen overflow-y-auto scrollbar-hide"
        style={{ scrollSnapType: "y mandatory" }}
      >
        {slides.map((slide, i) => (
          <Slide key={i} index={i} onVisible={handleVisible}>
            {slide}
          </Slide>
        ))}
      </div>
    </div>
  );
}
