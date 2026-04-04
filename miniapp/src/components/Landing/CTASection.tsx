"use client";

import { motion, useInView } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

export default function CTASection() {
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
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block text-[11px] font-bold uppercase tracking-[0.2em] text-accent mb-3">
            Get Started
          </span>

          {/* Giant CTA headline */}
          <h2
            className="font-coolvetica uppercase text-foreground"
            style={{ fontSize: "clamp(3rem, 14vw, 5rem)", lineHeight: 0.86, marginBottom: "1rem" }}
          >
            STOP
            <br />
            WAITING.
            <br />
            <span className="text-accent">START.</span>
          </h2>

          <p className="text-foreground/55 text-[14px] leading-relaxed max-w-[260px] mb-8">
            Verify once. Configure in minutes. No deployments, no servers. Just WLD.
          </p>

          <Link
            href="/create"
            className="group w-full inline-flex items-center justify-center gap-2 bg-accent text-white font-bold py-4 rounded-2xl text-[15px] transition-all active:scale-[0.98]"
            style={{ boxShadow: "0 4px 24px rgba(234,88,12,0.35)" }}
          >
            Create Your Claw
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>

          {/* Bottom trust strip */}
          <div className="mt-8 pt-6 border-t border-border/60 grid grid-cols-3 gap-2">
            {[
              { val: "38M+", label: "Users" },
              { val: "< 1min", label: "Deploy" },
              { val: "0 code", label: "Required" },
            ].map(({ val, label }) => (
              <div key={label}>
                <p className="font-coolvetica text-[1.4rem] text-foreground leading-none">{val}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{label}</p>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </section>
  );
}
