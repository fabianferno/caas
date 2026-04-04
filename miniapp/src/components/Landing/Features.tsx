"use client";

import { motion, useInView } from "framer-motion";
import { Coins, MessageSquareShare, Zap } from "lucide-react";
import { useRef } from "react";

const features = [
  {
    icon: Coins,
    title: "WLD-Native Credits",
    description:
      "All agent compute, messaging, and transactions are paid with World coins. Top up your agent's balance and it handles the rest — no credit cards, no gas juggling.",
  },
  {
    icon: MessageSquareShare,
    title: "Multi-Channel Agents",
    description:
      "Your Claw operates on WhatsApp, Telegram, and the web out of the box. One agent, every channel — managed from a single dashboard.",
  },
  {
    icon: Zap,
    title: "x402 Payments",
    description:
      "Agents handle microtransactions autonomously via the x402 protocol. Pay-per-call API access, automated billing, and instant settlement in WLD.",
  },
];

export default function Features() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-24 sm:py-32" ref={ref}>
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-coolvetica text-4xl sm:text-5xl text-foreground">
            Why CaaS
          </h2>
          <p className="text-muted-foreground mt-3 text-lg max-w-xl mx-auto">
            AI agents for verified humans — funded and operated entirely with WLD.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="relative rounded-2xl border-2 border-accent/15 hover:border-accent/30 bg-background p-8 transition-colors group"
            >
              <div className="w-14 h-14 rounded-2xl bg-accent/10 group-hover:bg-accent/15 flex items-center justify-center mb-6 transition-colors">
                <feature.icon className="w-7 h-7 text-accent" />
              </div>

              <h3 className="font-coolvetica text-2xl text-foreground mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
