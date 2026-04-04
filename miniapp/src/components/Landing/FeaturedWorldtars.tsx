"use client";

import { FEATURED_WORLDTARS } from "@/lib/worldtars-data";
import type { WorldtarData } from "@/lib/worldtars-data";
import { motion, useInView } from "framer-motion";
import { BadgeCheck, MessageCircle } from "lucide-react";
import { useRef } from "react";

function ClawCard({ claw, index }: { claw: WorldtarData; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="flex-shrink-0 w-52"
    >
      <div
        className={`relative rounded-2xl bg-gradient-to-br ${claw.gradient} p-4 h-64 flex flex-col justify-between overflow-hidden`}
      >
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-28 h-28 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-black/8 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        {/* Header row */}
        <div className="relative flex items-center justify-between">
          <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center border border-white/20">
            <span className="font-coolvetica text-base text-white/90">{claw.initials}</span>
          </div>
          <span className="inline-flex items-center gap-1 bg-black/20 backdrop-blur-sm rounded-full px-2 py-0.5">
            <BadgeCheck size={10} className="text-white" />
            <span className="text-[9px] text-white font-medium">Verified</span>
          </span>
        </div>

        {/* Info */}
        <div className="relative space-y-2">
          <div>
            <h3 className="font-coolvetica text-[1.2rem] uppercase text-white leading-tight">
              {claw.name}
            </h3>
            <p className="text-white/55 text-[11px] mt-0.5 line-clamp-2">{claw.bio}</p>
          </div>

          <p className="text-white/35 text-[10px] font-mono truncate">{claw.ens}</p>

          <div className="flex items-center justify-between pt-0.5">
            <span className="text-white/65 text-xs font-medium">{claw.price}</span>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-[#0a0a0a] active:scale-95 transition-transform"
            >
              <MessageCircle size={11} />
              Try
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function FeaturedWorldtars() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="featured" className="py-20 sm:py-28" ref={ref}>
      <div className="max-w-2xl mx-auto px-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <p className="text-[11px] text-accent font-semibold uppercase tracking-widest mb-3">
            Featured Claws
          </p>
          <h2 className="font-coolvetica text-[clamp(2.2rem,10vw,4rem)] uppercase leading-[0.92] text-foreground">
            DEPLOY IN
            <br />
            ONE CLICK.
          </h2>
          <p className="text-muted-foreground text-[14px] mt-3 max-w-xs leading-relaxed">
            Pre-built agent templates — customize or deploy straight out of the box.
          </p>
        </motion.div>
      </div>

      {/* Horizontal scroll — bleeds edge to edge */}
      <div className="overflow-x-auto overflow-y-visible pb-2 scrollbar-hide">
        <div className="flex gap-3 px-5 max-w-2xl mx-auto py-1">
          {FEATURED_WORLDTARS.map((claw, i) => (
            <ClawCard key={claw.ens} claw={claw} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
