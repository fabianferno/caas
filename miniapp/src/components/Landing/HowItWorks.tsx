"use client";

import { motion, useInView } from "framer-motion";
import { Fingerprint, Settings, Coins, Rocket } from "lucide-react";
import { useRef } from "react";

const steps = [
  {
    icon: Fingerprint,
    title: "Verify with World ID",
    description:
      "Prove you're a unique human using World ID. Only verified humans can spin up and operate Claw agents.",
  },
  {
    icon: Settings,
    title: "Configure Your Claw",
    description:
      "Pick a template or start from scratch. Set your agent's capabilities, channels, personality, and guardrails.",
  },
  {
    icon: Coins,
    title: "Fund with WLD",
    description:
      "Load your agent's balance with World coins. Credits cover LLM compute, messaging, x402 transactions, and more.",
  },
  {
    icon: Rocket,
    title: "Deploy & Go Live",
    description:
      "Your Claw goes live across WhatsApp, Telegram, and the web. Monitor usage and top up credits from your dashboard.",
  },
];

export default function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-24 sm:py-32 bg-surface" ref={ref}>
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-coolvetica text-4xl sm:text-5xl text-foreground">
            How It Works
          </h2>
          <p className="text-muted-foreground mt-3 text-lg max-w-xl mx-auto">
            From verification to a live AI agent in four simple steps.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="relative bg-background rounded-2xl p-6 border border-surface-dark/60"
            >
              {/* Step number */}
              <span className="absolute top-5 right-5 font-coolvetica text-5xl text-surface-dark/80 select-none">
                {i + 1}
              </span>

              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-5">
                <step.icon className="w-6 h-6 text-accent" />
              </div>

              <h3 className="font-coolvetica text-xl text-foreground mb-2">
                {step.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
