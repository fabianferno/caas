"use client";

import { motion, useInView } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

export default function CTASection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="cta" className="py-24 sm:py-32" ref={ref}>
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="relative bg-foreground rounded-3xl px-8 py-20 sm:px-16 sm:py-24 text-center overflow-hidden"
        >
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-accent/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/5 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl" />

          <div className="relative">
            <h2 className="font-coolvetica text-4xl sm:text-5xl md:text-6xl text-background leading-tight">
              Deploy Your First Agent
            </h2>
            <p className="mt-5 text-background/50 text-lg max-w-lg mx-auto">
              Spin up a Claw in minutes. Fund it with WLD. Let it work across
              every channel — autonomously.
            </p>
            <div className="mt-10">
              <Link
                href="/create"
                className="group inline-flex items-center gap-2 bg-accent hover:bg-accent-light text-white font-medium px-8 py-4 rounded-full transition-all text-lg shadow-lg shadow-accent/30"
              >
                Create Your Claw
                <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
