'use client';

import { Page } from '@/components/PageLayout';
import { VerificationBadge } from '@/components/VerificationBadge';
import { ALL_WORLDTARS } from '@/lib/worldtars-data';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Search,
  MessageCircle,
  TrendingUp,
  Star,
  Clock,
  Tag,
} from 'lucide-react';

const categories = [
  { id: 'all', label: 'All', icon: Search },
  { id: 'trending', label: 'Trending', icon: TrendingUp },
  { id: 'new', label: 'New', icon: Clock },
  { id: 'top', label: 'Top Rated', icon: Star },
  { id: 'topic', label: 'By Topic', icon: Tag },
];

const priceFilters = ['Any', 'Free', '<$0.10', '$0.10-$0.15', '>$0.15'];

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

    const matchesCategory =
      activeCategory === 'all' || w.category === activeCategory;

    let matchesPrice = true;
    if (activePrice === 'Free') matchesPrice = w.pricePerMin === 0;
    else if (activePrice === '<$0.10') matchesPrice = w.pricePerMin > 0 && w.pricePerMin < 0.1;
    else if (activePrice === '$0.10-$0.15') matchesPrice = w.pricePerMin >= 0.1 && w.pricePerMin <= 0.15;
    else if (activePrice === '>$0.15') matchesPrice = w.pricePerMin > 0.15;

    return matchesSearch && matchesCategory && matchesPrice;
  });

  return (
    <>
      <Page.Header className="bg-background px-5 pt-5 pb-2">
        <h1 className="font-coolvetica text-2xl text-foreground tracking-tight mb-3">
          Explore
        </h1>

        {/* Search Bar */}
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ENS name..."
            className="w-full bg-surface rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-accent/30 transition-all"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat.id
                  ? 'bg-accent text-white'
                  : 'bg-surface text-muted-foreground'
              }`}
            >
              <cat.icon size={13} />
              {cat.label}
            </button>
          ))}
        </div>

        {/* Price Filters */}
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1 scrollbar-hide">
          {priceFilters.map((price) => (
            <button
              key={price}
              onClick={() => setActivePrice(price)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${
                activePrice === price
                  ? 'bg-foreground text-white'
                  : 'bg-surface-dark text-muted-foreground'
              }`}
            >
              {price}
            </button>
          ))}
        </div>
      </Page.Header>

      <Page.Main className="bg-background pb-28 px-5 pt-3">
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {filtered.map((w, i) => (
              <motion.div
                key={w.ens}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.04 }}
                className="bg-card-bg rounded-2xl p-4 shadow-sm border border-surface-dark/50"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold text-sm">
                      {w.initials}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-sm text-foreground truncate">
                        {w.name}
                      </h3>
                      <VerificationBadge status={w.verification} size="sm" />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{w.ens}</p>
                    <p className="text-xs text-foreground/70 mt-1 line-clamp-2">
                      {w.bio}
                    </p>

                    {/* Community disclaimer */}
                    {w.verification === 'community' && w.disclaimer && (
                      <p className="text-[10px] text-muted-foreground/60 italic mt-1 leading-tight">
                        {w.disclaimer}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-accent">
                          {w.price}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <Star size={10} className="fill-current" />
                          {w.rating}
                        </span>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() =>
                          router.push(
                            `/chat/${w.ens.replace('.caas.eth', '')}`
                          )
                        }
                        className="bg-accent text-white text-xs font-medium px-4 py-1.5 rounded-full flex items-center gap-1"
                      >
                        <MessageCircle size={12} />
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
                className="text-center py-12"
              >
                <Search size={40} className="text-surface-dark mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No Claws found</p>
                <p className="text-muted-foreground/60 text-xs mt-1">
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
