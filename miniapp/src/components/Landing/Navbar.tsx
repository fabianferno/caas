"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  return (
    <motion.nav
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border"
    >
      <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.svg" alt="CaaS" width={22} height={22} />
          <span className="font-coolvetica text-xl uppercase tracking-tight text-foreground">
            CaaS
          </span>
        </Link>

        <Link
          href="/create"
          className="group inline-flex items-center gap-1.5 bg-accent text-white font-semibold text-[13px] px-4 py-2 rounded-xl transition-all hover:bg-accent-light active:scale-95"
        >
          Get Started
          <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </motion.nav>
  );
}
