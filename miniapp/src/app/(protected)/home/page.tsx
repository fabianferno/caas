'use client';

import { Page } from '@/components/PageLayout';
import { CaasLogo } from '@/components/CaasLogo';
import { FEATURED_WORLDTARS } from '@/lib/worldtars-data';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  MessageCircle,
  Plus,
  Copy,
  ShieldCheck,
  Globe,
  Coins,
  ArrowRight,
  User,
} from 'lucide-react';

const quickActions = [
  { label: 'Create Claw', icon: Plus, iconColor: '#7b96f5', href: '/create' },
  { label: 'My Agents', icon: Copy, iconColor: '#6dd5d9', href: '/profile' },
];

export default function Home() {
  const router = useRouter();

  return (
    <>
      <Page.Header className="px-5 pt-6 pb-5" style={{ background: '#e0e5ec' } as React.CSSProperties}>
        <div className="flex items-center justify-between mb-3">
          <CaasLogo />
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/profile')}
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: '#e0e5ec', boxShadow: '4px 4px 12px #b3b7bd, -4px -4px 12px rgba(255,255,255,0.5)' }}
          >
            <User size={18} style={{ color: '#8a9bb0' }} />
          </motion.button>
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: '#b3b7bd' }}>
          Agents as a Service
        </p>
      </Page.Header>

      <Page.Main className="pb-24 px-5 pt-5 space-y-6" style={{ background: '#e0e5ec' } as React.CSSProperties}>

        {/* Quick Actions */}
        <section>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: '#8a9bb0' }}>
            Quick Actions
          </p>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, i) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => router.push(action.href)}
                className="rounded-2xl p-4 flex flex-col justify-between text-left"
                style={{
                  background: '#e0e5ec',
                  boxShadow: '6px 6px 16px #b3b7bd, -6px -6px 16px rgba(255,255,255,0.5)',
                  minHeight: 112,
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ boxShadow: 'inset 2px 2px 5px #b3b7bd, inset -2px -2px 5px rgba(255,255,255,0.85)' }}
                >
                  <action.icon size={18} style={{ color: action.iconColor }} />
                </div>
                <span
                  className="font-coolvetica text-[0.95rem] uppercase leading-tight"
                  style={{ color: '#31456a' }}
                >
                  {action.label}
                </span>
              </motion.button>
            ))}
          </div>
        </section>

        {/* Featured Claws */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: '#8a9bb0' }}>
              Featured Claws
            </p>
            <button
              onClick={() => router.push('/explore')}
              className="text-[11px] font-semibold flex items-center gap-1"
              style={{ color: '#7b96f5' }}
            >
              See all <ArrowRight size={11} />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
            {FEATURED_WORLDTARS.map((w, i) => (
              <motion.div
                key={w.ens}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="flex-shrink-0 w-44"
              >
                <div
                  className="rounded-2xl p-4 flex flex-col justify-between"
                  style={{
                    background: '#e0e5ec',
                    boxShadow: '6px 6px 16px #b3b7bd, -6px -6px 16px rgba(255,255,255,0.5)',
                    minHeight: 200,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{
                        background: '#7b96f5',
                        boxShadow: '3px 3px 8px #b3b7bd, -1px -1px 6px rgba(255,255,255,0.5)',
                      }}
                    >
                      <span className="text-white font-semibold text-sm">{w.initials}</span>
                    </div>
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ boxShadow: 'inset 2px 2px 4px #b3b7bd, inset -2px -2px 4px rgba(255,255,255,0.85)' }}
                    >
                      <ShieldCheck size={11} style={{ color: '#7b96f5' }} />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-coolvetica text-[1.05rem] uppercase leading-tight" style={{ color: '#31456a' }}>
                      {w.name}
                    </h3>
                    <p className="text-[10px] mt-0.5 font-mono truncate" style={{ color: '#8a9bb0' }}>{w.ens}</p>
                    <p className="text-[11px] mt-1 line-clamp-2" style={{ color: '#8a9bb0' }}>{w.bio}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[11px] font-semibold" style={{ color: '#7b96f5' }}>{w.price}</span>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => router.push(`/chat/${w.ens.replace('.caas.eth', '')}`)}
                        className="text-[11px] font-semibold px-3 py-1.5 rounded-full flex items-center gap-1"
                        style={{
                          color: '#7b96f5',
                          background: '#e0e5ec',
                          boxShadow: 'inset 2px 2px 4px #b3b7bd, inset -2px -2px 4px rgba(255,255,255,0.85)',
                        }}
                      >
                        <MessageCircle size={11} />
                        Try
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Stats strip */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl p-5 grid grid-cols-3 gap-3"
          style={{
            background: '#e0e5ec',
            boxShadow: '6px 6px 16px #b3b7bd, -6px -6px 16px rgba(255,255,255,0.5)',
          }}
        >
          {[
            { icon: Globe, val: "38M+", label: "World Users", color: '#7b96f5' },
            { icon: Coins, val: "WLD", label: "Credits", color: '#6dd5d9' },
            { icon: ShieldCheck, val: "100%", label: "Verified", color: '#7b96f5' },
          ].map(({ icon: Icon, val, label, color }) => (
            <div key={label} className="text-center">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-2"
                style={{ boxShadow: 'inset 2px 2px 5px #b3b7bd, inset -2px -2px 5px rgba(255,255,255,0.85)' }}
              >
                <Icon size={14} style={{ color }} />
              </div>
              <p className="font-coolvetica text-[1.15rem] leading-none" style={{ color: '#31456a' }}>{val}</p>
              <p className="text-[10px] mt-0.5 leading-tight" style={{ color: '#8a9bb0' }}>{label}</p>
            </div>
          ))}
        </motion.section>

      </Page.Main>
    </>
  );
}
