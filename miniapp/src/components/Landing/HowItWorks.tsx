"use client";

import { motion, useInView } from "framer-motion";
import { Coins, Fingerprint, Rocket, Settings } from "lucide-react";
import { useRef } from "react";

const steps = [
  {
    num: "01",
    icon: Fingerprint,
    title: "VERIFY",
    description: "Prove you're human with World ID.",
    bg: "#ea580c",
    fg: "#fff",
    subFg: "rgba(255,255,255,0.6)",
    numFg: "rgba(255,255,255,0.07)",
    tag: "IDENTITY",
    tagBg: "rgba(255,255,255,0.15)",
    tagFg: "#fff",
  },
  {
    num: "02",
    icon: Settings,
    title: "CONFIGURE",
    description: "Name, channels, personality.",
    bg: "#242424",
    fg: "#fff",
    subFg: "rgba(255,255,255,0.5)",
    numFg: "rgba(255,255,255,0.05)",
    tag: "SETUP",
    tagBg: "rgba(255,255,255,0.08)",
    tagFg: "rgba(255,255,255,0.6)",
  },
  {
    num: "03",
    icon: Coins,
    title: "FUND",
    description: "Top up WLD credits.",
    bg: "#fbbf24",
    fg: "#111",
    subFg: "rgba(0,0,0,0.5)",
    numFg: "rgba(0,0,0,0.06)",
    tag: "PAYMENT",
    tagBg: "rgba(0,0,0,0.1)",
    tagFg: "#111",
  },
  {
    num: "04",
    icon: Rocket,
    title: "DEPLOY",
    description: "Go live instantly. No servers.",
    bg: "#818cf8",
    fg: "#fff",
    subFg: "rgba(255,255,255,0.6)",
    numFg: "rgba(255,255,255,0.07)",
    tag: "LAUNCH",
    tagBg: "rgba(255,255,255,0.15)",
    tagFg: "#fff",
  },
];

export default function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <section
      className="flex flex-col justify-center min-h-dvh py-10 px-5"
      style={{ background: "#111" }}
      ref={ref}
    >
      <div className="max-w-sm mx-auto w-full">

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="mb-5"
        >
          <span className="inline-block text-[11px] font-bold uppercase tracking-[0.2em] text-accent mb-3">
            How It Works
          </span>
          <h2
            className="font-coolvetica uppercase text-foreground"
            style={{ fontSize: "clamp(2.6rem,12vw,4rem)", lineHeight: 0.88 }}
          >
            LIVE IN
            <br />
            FOUR
            <br />
            STEPS.
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 gap-2.5">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: i * 0.07, duration: 0.4 }}
              className="rounded-2xl p-4 relative overflow-hidden flex flex-col justify-between"
              style={{ background: step.bg, minHeight: 148 }}
            >
              {/* Big bg number */}
              <span
                className="absolute right-1 top-0 font-coolvetica select-none pointer-events-none"
                style={{
                  fontSize: "4.5rem",
                  lineHeight: 1,
                  color: step.numFg,
                }}
              >
                {step.num}
              </span>

              {/* Tag */}
              <span
                className="relative z-10 self-start text-[9px] font-bold uppercase tracking-[0.15em] px-2 py-1 rounded-full"
                style={{ background: step.tagBg, color: step.tagFg }}
              >
                {step.tag}
              </span>

              {/* Content */}
              <div className="relative z-10 mt-3">
                <step.icon size={18} style={{ color: step.fg, opacity: 0.65, marginBottom: 6 }} />
                <p
                  className="font-coolvetica uppercase leading-tight text-[1.25rem]"
                  style={{ color: step.fg }}
                >
                  {step.title}
                </p>
                <p
                  className="text-[11px] mt-1 leading-snug"
                  style={{ color: step.subFg }}
                >
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
