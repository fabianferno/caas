"use client";

import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-surface-dark/60 bg-surface py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <Image src="/logo.svg" alt="CaaS" width={24} height={24} />
            <span className="font-coolvetica text-lg text-foreground">
              CaaS
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link
              href="#featured"
              className="hover:text-foreground transition-colors"
            >
              Explore
            </Link>
            <Link
              href="/create"
              className="hover:text-foreground transition-colors"
            >
              Create
            </Link>
            <Link
              href="#"
              className="hover:text-foreground transition-colors"
            >
              About
            </Link>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-surface-dark/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground/60">
            Powered by 0G &middot; World &middot; ENS
          </p>
          <p className="text-xs text-muted-foreground/60">
            &copy; {new Date().getFullYear()} CaaS. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
