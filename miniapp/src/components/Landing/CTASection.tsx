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
      className="flex flex-col justify-center min-h-dvh py-12 px-5"
      style={{ background: "#e0e5ec" }}
      ref={ref}
    >
      <div className="max-w-sm mx-auto w-full">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block text-[11px] font-bold uppercase tracking-[0.2em] mb-3 gradient-text">
            Get Started
          </span>

          <h2
            className="font-coolvetica uppercase"
            style={{ fontSize: "clamp(3rem, 14vw, 5rem)", lineHeight: 0.86, marginBottom: "1rem", color: "#31456a" }}
          >
            STOP
            <br />
            WAITING.
            <br />
            <span className="gradient-text">START.</span>
          </h2>

          <p className="text-[14px] leading-relaxed max-w-[260px] mb-8" style={{ color: "#8a9bb0" }}>
            Verify once. Configure in minutes. No deployments, no servers. Just WLD.
          </p>

          <Link
            href="/create"
            className="group w-full inline-flex items-center justify-center gap-2 font-bold py-4 rounded-2xl text-[15px] transition-all active:scale-[0.98] text-white nm-btn-accent"
          >
            Create Your Claw
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>

          {/* Trust strip */}
          <div
            className="mt-8 pt-6 grid grid-cols-3 gap-2"
            style={{ borderTop: "1px solid rgba(163, 177, 198, 0.5)" }}
          >
            {[
              { val: "< 1min", label: "Deploy" },
              { val: "0 code", label: "Required" },
            ].map(({ val, label }) => (
              <div key={label}>
                <p className="font-coolvetica text-[1.4rem] leading-none" style={{ color: "#31456a" }}>{val}</p>
                <p className="text-[10px] uppercase tracking-wider mt-1" style={{ color: "#8a9bb0" }}>{label}</p>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </section>
  );
}
