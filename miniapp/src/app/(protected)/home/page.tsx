'use client';

import { Page } from '@/components/PageLayout';
import { FEATURED_WORLDTARS } from '@/lib/worldtars-data';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  MessageCircle,
  Plus,
  Compass,
  Copy,
  ShieldCheck,
  Globe,
  Coins,
} from 'lucide-react';

const quickActions = [
  {
    label: 'Create Claw',
    icon: Plus,
    href: '/create',
    color: 'bg-accent',
  },
  {
    label: 'Browse All',
    icon: Compass,
    href: '/explore',
    color: 'bg-accent-light',
  },
  {
    label: 'My Agents',
    icon: Copy,
    href: '/profile',
    color: 'bg-accent-dark',
  },
];

export default function Home() {
  const router = useRouter();

  return (
    <>
      <Page.Header className="bg-background px-5 pt-5 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-coolvetica text-2xl text-foreground tracking-tight">
              CaaS
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              AI agents powered by World
            </p>
          </div>
          <motion.div
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-full bg-accent flex items-center justify-center"
          >
            <Sparkles size={18} className="text-white" />
          </motion.div>
        </div>
      </Page.Header>

      <Page.Main className="bg-background pb-28 px-5 pt-4 space-y-6">
        {/* Featured Claws */}
        <section>
          <h2 className="font-coolvetica text-lg text-foreground mb-3">
            Featured Claws
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
            {FEATURED_WORLDTARS.map((w, i) => (
              <motion.div
                key={w.ens}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex-shrink-0 w-44"
              >
                <div
                  className={`bg-gradient-to-br ${w.gradient} rounded-2xl p-4 h-full flex flex-col justify-between min-h-[220px]`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {w.initials}
                        </span>
                      </div>
                      <span className="bg-white/20 rounded-full p-1" title="Verified Agent">
                        <ShieldCheck size={12} className="text-white" />
                      </span>
                    </div>
                    <h3 className="text-white font-semibold text-sm leading-tight">
                      {w.name}
                    </h3>
                    <p className="text-white/70 text-xs mt-0.5">{w.ens}</p>
                    <p className="text-white/60 text-xs mt-1">{w.bio}</p>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-white/90 text-xs font-medium">
                      {w.price}
                    </span>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() =>
                        router.push(
                          `/chat/${w.ens.replace('.caas.eth', '')}`
                        )
                      }
                      className="bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1"
                    >
                      <MessageCircle size={12} />
                      Try
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section>
          <h2 className="font-coolvetica text-lg text-foreground mb-3">
            Quick Actions
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map((action, i) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push(action.href)}
                className="bg-surface rounded-2xl p-4 flex flex-col items-center gap-2 text-center"
              >
                <div
                  className={`${action.color} w-10 h-10 rounded-full flex items-center justify-center`}
                >
                  <action.icon size={18} className="text-white" />
                </div>
                <span className="text-xs font-medium text-foreground leading-tight">
                  {action.label}
                </span>
              </motion.button>
            ))}
          </div>
        </section>

        {/* Stats Banner */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-r from-accent to-accent-light rounded-2xl p-5"
        >
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="flex items-center justify-center mb-1">
                <Globe size={16} className="text-white/80" />
              </div>
              <p className="text-white font-bold text-sm">38M+</p>
              <p className="text-white/70 text-[10px] leading-tight">
                World Users
              </p>
            </div>
            <div>
              <div className="flex items-center justify-center mb-1">
                <Coins size={16} className="text-white/80" />
              </div>
              <p className="text-white font-bold text-sm">WLD</p>
              <p className="text-white/70 text-[10px] leading-tight">
                Native Credits
              </p>
            </div>
            <div>
              <div className="flex items-center justify-center mb-1">
                <ShieldCheck size={16} className="text-white/80" />
              </div>
              <p className="text-white font-bold text-sm">Verified</p>
              <p className="text-white/70 text-[10px] leading-tight">
                Humans Only
              </p>
            </div>
          </div>
        </motion.section>
      </Page.Main>
    </>
  );
}
