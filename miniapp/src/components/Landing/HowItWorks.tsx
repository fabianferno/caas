"use client";

import { motion, useInView } from "framer-motion";
import { Coins, Fingerprint, Rocket, Settings } from "lucide-react";
import { useRef } from "react";

const steps = [
  {
    num: "01",
    icon: Fingerprint,
    iconColor: "#7b96f5",
    title: "VERIFY",
    description: "Prove you're human with World ID.",
    tag: "IDENTITY",
  },
  {
    num: "02",
    icon: Settings,
    iconColor: "#6dd5d9",
    title: "CONFIGURE",
    description: "Name, channels, personality.",
    tag: "SETUP",
  },
  {
    num: "03",
    icon: Coins,
    iconColor: "#7b96f5",
    title: "FUND",
    description: "Top up WLD credits.",
    tag: "PAYMENT",
  },
  {
    num: "04",
    icon: Rocket,
    iconColor: "#6dd5d9",
    title: "DEPLOY",
    description: "Go live instantly. No servers.",
    tag: "LAUNCH",
  },
];

export default function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <section
      className="flex flex-col justify-center min-h-dvh py-12 px-5"
      style={{ background: "#e0e5ec" }}
      ref={ref}
    >
      <div className="max-w-sm mx-auto w-full">

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="mb-6"
        >
          <span className="inline-block text-[11px] font-bold uppercase tracking-[0.2em] mb-3 gradient-text">
            How It Works
          </span>
          <h2
            className="font-coolvetica uppercase"
            style={{ fontSize: "clamp(2.6rem,12vw,4rem)", lineHeight: 0.88, color: "#31456a" }}
          >
            LIVE IN
            <br />
            FOUR
            <br />
            STEPS.
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: i * 0.07, duration: 0.4 }}
              className="rounded-2xl p-4 relative overflow-hidden flex flex-col justify-between"
              style={{
                background: "#e0e5ec",
                boxShadow: "6px 6px 16px #b3b7bd, -6px -6px 16px rgba(255,255,255,0.5)",
                minHeight: 152,
              }}
            >
              {/* Big bg number */}
              <span
                className="absolute right-1 top-0 font-coolvetica select-none pointer-events-none"
                style={{
                  fontSize: "4.5rem",
                  lineHeight: 1,
                  color: "rgba(163, 177, 198, 0.35)",
                }}
              >
                {step.num}
              </span>

              {/* Tag */}
              <span
                className="relative z-10 self-start text-[9px] font-bold uppercase tracking-[0.15em] px-2.5 py-1 rounded-full"
                style={{
                  color: step.iconColor,
                  background: "#e0e5ec",
                  boxShadow: "inset 2px 2px 4px #b3b7bd, inset -2px -2px 4px rgba(255,255,255,0.85)",
                }}
              >
                {step.tag}
              </span>

              {/* Content */}
              <div className="relative z-10 mt-3">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center mb-2"
                  style={{ boxShadow: "inset 2px 2px 5px #b3b7bd, inset -2px -2px 5px rgba(255,255,255,0.85)" }}
                >
                  <step.icon size={15} style={{ color: step.iconColor }} />
                </div>
                <p className="font-coolvetica uppercase leading-tight text-[1.2rem]" style={{ color: "#31456a" }}>
                  {step.title}
                </p>
                <p className="text-[11px] mt-1 leading-snug" style={{ color: "#8a9bb0" }}>
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
