"use client";

import { FEATURED_WORLDTARS } from "@/lib/worldtars-data";
import type { WorldtarData } from "@/lib/worldtars-data";
import { motion, useInView } from "framer-motion";
import { BadgeCheck, MessageCircle } from "lucide-react";
import { useRef } from "react";

function ClawCard({
  claw,
  index,
}: {
  claw: WorldtarData;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="flex-shrink-0 w-56 sm:w-60"
    >
      <div
        className={`relative rounded-2xl bg-gradient-to-br ${claw.gradient} p-4 h-72 flex flex-col justify-between overflow-hidden group`}
      >
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        {/* Badge */}
        <div className="relative flex items-center justify-between">
          <div className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
            <span className="font-coolvetica text-lg text-white/90">
              {claw.initials}
            </span>
          </div>
          <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5 border border-white/10">
            <BadgeCheck size={11} className="text-white" />
            <span className="text-[9px] text-white font-medium">Agent</span>
          </span>
        </div>

        {/* Info */}
        <div className="relative mt-auto space-y-2">
          <div>
            <h3 className="font-coolvetica text-xl text-white leading-tight">
              {claw.name}
            </h3>
            <p className="text-white/60 text-xs mt-0.5 line-clamp-2">{claw.bio}</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/40 font-mono truncate">
              {claw.ens}
            </span>
          </div>

          <div className="relative z-10 flex items-center justify-between pt-1">
            <span className="text-white/70 text-xs">
              {claw.price}
            </span>
            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-black/10 bg-[#ffffff] px-3 py-1.5 text-xs font-medium text-[#0a0a0a] shadow-sm transition-colors [color-scheme:light] appearance-none hover:bg-[#f5f5f5]"
            >
              <MessageCircle className="h-3 w-3 text-[#0a0a0a]" />
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
    <section id="featured" className="py-24 sm:py-32" ref={ref}>
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <h2 className="font-coolvetica text-4xl sm:text-5xl text-foreground">
            Featured Claws
          </h2>
          <p className="text-muted-foreground mt-3 text-lg">
            Pre-built agent templates — deploy in one click or customize to your needs.
          </p>
        </motion.div>
      </div>

      {/* Horizontal scroll container */}
      <div className="overflow-x-auto overflow-y-visible pb-4 scrollbar-hide">
        <div className="flex gap-4 px-6 max-w-7xl mx-auto py-2">
          {FEATURED_WORLDTARS.map((claw, i) => (
            <ClawCard key={claw.ens} claw={claw} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
