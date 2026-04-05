"use client";

import { motion, useInView } from "framer-motion";
import { Coins, MessageSquareShare, ShieldCheck, Zap } from "lucide-react";
import { useRef } from "react";

const features = [
  {
    icon: Coins,
    iconColor: "#7b96f5",
    title: "WLD CREDITS",
    sub: "No cards. No gas. All compute paid natively in WLD.",
    tag: "PAYMENTS",
    span: "col-span-2",
    tall: true,
  },
  {
    icon: MessageSquareShare,
    iconColor: "#6dd5d9",
    title: "MULTI-CHANNEL",
    sub: "WhatsApp · Telegram · Web",
    tag: "REACH",
    span: "col-span-1",
    tall: false,
  },
  {
    icon: Zap,
    iconColor: "#7b96f5",
    title: "x402 PAY",
    sub: "Autonomous micropayments",
    tag: "PROTOCOL",
    span: "col-span-1",
    tall: false,
  },
  {
    icon: ShieldCheck,
    iconColor: "#6dd5d9",
    title: "WORLD ID VERIFIED",
    sub: "Every Claw tied to a real human. No bots.",
    tag: "IDENTITY",
    span: "col-span-2",
    tall: false,
  },
];

export default function Features() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <section
      id="features"
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
            Why CaaS
          </span>
          <h2
            className="font-coolvetica uppercase"
            style={{ fontSize: "clamp(2.6rem,12vw,4rem)", lineHeight: 0.88, color: "#31456a" }}
          >
            EVERYTHING
            <br />
            YOUR AGENT
            <br />
            NEEDS.
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.06 + i * 0.08, duration: 0.45 }}
              className={`${f.span} rounded-2xl p-4 flex flex-col justify-between`}
              style={{
                background: "#e0e5ec",
                boxShadow: "6px 6px 16px #b3b7bd, -6px -6px 16px rgba(255,255,255,0.5)",
                minHeight: f.span === "col-span-2" && f.tall ? 160 : f.span === "col-span-2" ? 100 : 134,
              }}
            >
              {/* Tag + icon row */}
              <div className="flex items-center justify-between mb-auto">
                <span
                  className="text-[9px] font-bold uppercase tracking-[0.18em] px-2.5 py-1 rounded-full"
                  style={{
                    color: f.iconColor,
                    background: "#e0e5ec",
                    boxShadow: "inset 2px 2px 4px #b3b7bd, inset -2px -2px 4px rgba(255,255,255,0.85)",
                  }}
                >
                  {f.tag}
                </span>
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ boxShadow: "inset 2px 2px 5px #b3b7bd, inset -2px -2px 5px rgba(255,255,255,0.85)" }}
                >
                  <f.icon size={16} style={{ color: f.iconColor }} />
                </div>
              </div>
              <div style={{ marginTop: f.span === "col-span-2" && f.tall ? 16 : 10 }}>
                <p
                  className="font-coolvetica uppercase leading-tight"
                  style={{
                    color: "#31456a",
                    fontSize: f.span === "col-span-2" ? "1.3rem" : "1.05rem",
                  }}
                >
                  {f.title}
                </p>
                <p className="text-[11px] mt-1 leading-snug" style={{ color: "#8a9bb0" }}>
                  {f.sub}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
