"use client";

import { motion, useInView } from "framer-motion";
import { Coins, MessageSquareShare, ShieldCheck, Zap } from "lucide-react";
import { useRef } from "react";

const features = [
  {
    icon: Coins,
    title: "WLD CREDITS",
    sub: "No cards. No gas. All compute paid natively in WLD.",
    bg: "#ea580c",
    fg: "#fff",
    tag: "PAYMENTS",
    tagBg: "rgba(255,255,255,0.18)",
    tagFg: "#fff",
    span: "col-span-2",
    tall: true,
  },
  {
    icon: MessageSquareShare,
    title: "MULTI-CHANNEL",
    sub: "WhatsApp · Telegram · Web",
    bg: "#fbbf24",
    fg: "#111",
    tag: "REACH",
    tagBg: "rgba(0,0,0,0.1)",
    tagFg: "#111",
    span: "col-span-1",
    tall: false,
  },
  {
    icon: Zap,
    title: "x402 PAY",
    sub: "Autonomous micropayments",
    bg: "#818cf8",
    fg: "#fff",
    tag: "PROTOCOL",
    tagBg: "rgba(255,255,255,0.18)",
    tagFg: "#fff",
    span: "col-span-1",
    tall: false,
  },
  {
    icon: ShieldCheck,
    title: "WORLD ID VERIFIED",
    sub: "Every Claw tied to a real human. No bots.",
    bg: "#242424",
    fg: "#fff",
    tag: "IDENTITY",
    tagBg: "rgba(234,88,12,0.2)",
    tagFg: "#ea580c",
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
      className="flex flex-col justify-center min-h-dvh py-10 px-5"
      style={{ background: "#111" }}
      ref={ref}
    >
      <div className="max-w-sm mx-auto w-full">

        {/* Section label */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="mb-5"
        >
          <span className="inline-block text-[11px] font-bold uppercase tracking-[0.2em] text-accent mb-3">
            Why CaaS
          </span>
          <h2
            className="font-coolvetica uppercase text-foreground"
            style={{ fontSize: "clamp(2.6rem,12vw,4rem)", lineHeight: 0.88 }}
          >
            EVERYTHING
            <br />
            YOUR AGENT
            <br />
            NEEDS.
          </h2>
        </motion.div>

        {/* Bento */}
        <div className="grid grid-cols-2 gap-2.5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.06 + i * 0.08, duration: 0.45 }}
              className={`${f.span} rounded-2xl p-4 flex flex-col justify-between`}
              style={{
                background: f.bg,
                minHeight: f.span === "col-span-2" && f.tall ? 160 : f.span === "col-span-2" ? 96 : 130,
              }}
            >
              {/* Tag + icon row */}
              <div className="flex items-center justify-between mb-auto">
                <span
                  className="text-[9px] font-bold uppercase tracking-[0.18em] px-2 py-1 rounded-full"
                  style={{ background: f.tagBg, color: f.tagFg }}
                >
                  {f.tag}
                </span>
                <f.icon size={18} style={{ color: f.fg, opacity: 0.65 }} />
              </div>
              <div style={{ marginTop: f.span === "col-span-2" && f.tall ? 16 : 10 }}>
                <p
                  className="font-coolvetica uppercase leading-tight"
                  style={{
                    color: f.fg,
                    fontSize: f.span === "col-span-2" ? "1.35rem" : "1.05rem",
                  }}
                >
                  {f.title}
                </p>
                <p
                  className="text-[11px] mt-1 leading-snug"
                  style={{ color: f.fg, opacity: 0.55 }}
                >
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
