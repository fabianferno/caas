'use client';

import { Page } from '@/components/PageLayout';
import { VerificationBadge } from '@/components/VerificationBadge';
import { ALL_WORLDTARS } from '@/lib/worldtars-data';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search, MessageCircle, Star, SlidersHorizontal } from 'lucide-react';

const categories = [
  { id: 'all', label: 'All' },
  { id: 'trending', label: 'Trending' },
  { id: 'new', label: 'New' },
  { id: 'top', label: 'Top' },
  { id: 'topic', label: 'Topic' },
];

const priceFilters = ['Any', 'Free', '<$0.10', '$0.10–$0.15', '>$0.15'];

export default function Explore() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activePrice, setActivePrice] = useState('Any');

  const filtered = ALL_WORLDTARS.filter((w) => {
    const matchesSearch =
      search === '' ||
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.ens.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'all' || w.category === activeCategory;
    let matchesPrice = true;
    if (activePrice === 'Free') matchesPrice = w.pricePerMin === 0;
    else if (activePrice === '<$0.10') matchesPrice = w.pricePerMin > 0 && w.pricePerMin < 0.1;
    else if (activePrice === '$0.10–$0.15') matchesPrice = w.pricePerMin >= 0.1 && w.pricePerMin <= 0.15;
    else if (activePrice === '>$0.15') matchesPrice = w.pricePerMin > 0.15;
    return matchesSearch && matchesCategory && matchesPrice;
  });

  return (
    <>
      <Page.Header className="bg-background px-5 pt-6 pb-3">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-coolvetica text-[1.9rem] uppercase text-foreground leading-none tracking-tight">
            EXPLORE
          </h1>
          <div className="w-8 h-8 rounded-xl bg-surface flex items-center justify-center">
            <SlidersHorizontal size={15} className="text-muted-foreground" />
          </div>
        </div>

        {/* Search */}
        <div
          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <Search size={15} className="text-muted-foreground shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or ENS..."
            className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground/50 outline-none"
          />
        </div>

        {/* Category pills */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-0.5 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className="px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide whitespace-nowrap transition-all"
              style={{
                background: activeCategory === cat.id ? '#ea580c' : 'rgba(255,255,255,0.07)',
                color: activeCategory === cat.id ? '#fff' : 'rgba(255,255,255,0.45)',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Price pills */}
        <div className="flex gap-1.5 mt-2 overflow-x-auto pb-0.5 scrollbar-hide">
          {priceFilters.map((price) => (
            <button
              key={price}
              onClick={() => setActivePrice(price)}
              className="px-3 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-all uppercase tracking-wide"
              style={{
                background: activePrice === price ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                color: activePrice === price ? '#fff' : 'rgba(255,255,255,0.35)',
                border: activePrice === price ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent',
              }}
            >
              {price}
            </button>
          ))}
        </div>
      </Page.Header>

      <Page.Main className="bg-background pb-28 px-5 pt-3">
        {/* Result count */}
        <p className="text-[11px] text-muted-foreground/50 uppercase tracking-[0.15em] mb-3">
          {filtered.length} agent{filtered.length !== 1 ? 's' : ''} found
        </p>

        <AnimatePresence mode="popLayout">
          <div className="space-y-2.5">
            {filtered.map((w, i) => (
              <motion.div
                key={w.ens}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-2xl p-4"
                style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "linear-gradient(135deg, #ea580c, #9a3412)" }}
                  >
                    <span className="text-white font-bold text-sm">{w.initials}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <h3 className="font-coolvetica text-[1rem] uppercase text-foreground leading-tight truncate">
                        {w.name}
                      </h3>
                      <VerificationBadge status={w.verification} size="sm" />
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 font-mono truncate mb-1">{w.ens}</p>
                    <p className="text-[12px] text-foreground/60 line-clamp-2 leading-snug">{w.bio}</p>

                    {w.verification === 'community' && w.disclaimer && (
                      <p className="text-[10px] text-muted-foreground/40 italic mt-1 leading-tight">
                        {w.disclaimer}
                      </p>
                    )}

                    {/* Price + CTA */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(234,88,12,0.15)", color: "#ea580c" }}
                        >
                          {w.price}
                        </span>
                        <span className="text-[11px] text-muted-foreground/60 flex items-center gap-0.5">
                          <Star size={10} className="fill-current text-yellow-400" />
                          {w.rating}
                        </span>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={() => router.push(`/chat/${w.ens.replace('.caas.eth', '')}`)}
                        className="flex items-center gap-1.5 bg-accent text-white text-[11px] font-bold px-4 py-2 rounded-full"
                      >
                        <MessageCircle size={11} />
                        Chat
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {filtered.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <Search size={36} className="text-muted-foreground/20 mx-auto mb-4" />
                <p className="font-coolvetica text-[1.4rem] uppercase text-muted-foreground/40">
                  No Claws found
                </p>
                <p className="text-[12px] text-muted-foreground/30 mt-1">
                  Try a different search or filter
                </p>
              </motion.div>
            )}
          </div>
        </AnimatePresence>
      </Page.Main>
    </>
  );
}
