'use client';

import { Page } from '@/components/PageLayout';
import { CaasLogo } from '@/components/CaasLogo';
import { VerificationBadge } from '@/components/VerificationBadge';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  Plus,
  Coins,
  Settings,
  Lock,
  ArrowRightLeft,
  ChevronRight,
  Flag,
  MessageSquareShare,
} from 'lucide-react';
import { useState } from 'react';

const creditStats = [
  { label: 'Balance', value: '0 WLD' },
  { label: 'This Week', value: '0 WLD' },
  { label: 'Total Spent', value: '0 WLD' },
];

const settingsLinks = [
  {
    label: 'Credits',
    description: 'Top up WLD for compute, messaging, and x402',
    icon: Coins,
    iconColor: '#7b96f5',
  },
  {
    label: 'Channels',
    description: 'Manage WhatsApp, Telegram, and web integrations',
    icon: MessageSquareShare,
    iconColor: '#6dd5d9',
  },
  {
    label: 'Privacy',
    description: 'Control access and data sharing',
    icon: Lock,
    iconColor: '#7b96f5',
  },
  {
    label: 'Transfers',
    description: 'Transfer agent ownership',
    icon: ArrowRightLeft,
    iconColor: '#6dd5d9',
  },
  {
    label: 'Report a Claw',
    description: 'Flag abusive or harmful agents',
    icon: Flag,
    iconColor: '#ef4444',
  },
];

export default function Profile() {
  const router = useRouter();
  const [showReportSheet, setShowReportSheet] = useState(false);

  return (
    <>
      <Page.Header className="px-5 pt-6 pb-5" style={{ background: '#e0e5ec' } as React.CSSProperties}>
        <div className="flex items-center justify-between mb-3">
          <CaasLogo />
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: '#e0e5ec', boxShadow: '4px 4px 12px #b3b7bd, -4px -4px 12px rgba(255,255,255,0.5)' }}
          >
            <Settings size={18} style={{ color: '#8a9bb0' }} />
          </motion.button>
        </div>
        <h1
          className="font-coolvetica text-[2rem] uppercase leading-none tracking-tight"
          style={{ color: '#e0e5ec', textShadow: '-2px -2px 4px #b3b7bd, 2px 2px 5px rgba(255,255,255,0.95)' }}
        >
          Profile
        </h1>
      </Page.Header>

      <Page.Main className="pb-24 px-5 pt-5 space-y-6" style={{ background: '#e0e5ec' } as React.CSSProperties}>

        {/* User Info */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5"
          style={{ background: '#e0e5ec', boxShadow: '6px 6px 16px #b3b7bd, -6px -6px 16px rgba(255,255,255,0.5)' }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background: '#7b96f5',
                boxShadow: '4px 4px 10px #b3b7bd, -2px -2px 8px rgba(255,255,255,0.5)',
              }}
            >
              <span className="text-white font-bold text-lg">You</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <VerificationBadge status="self" size="md" showLabel />
              </div>
              <div className="flex items-center gap-1.5">
                <Wallet size={13} style={{ color: '#8a9bb0' }} />
                <p className="text-xs font-mono" style={{ color: '#8a9bb0' }}>
                  0x1234...5678
                </p>
              </div>
              <p className="text-[10px] mt-1" style={{ color: '#b3b7bd' }}>
                Verified human · Agent operator
              </p>
            </div>
          </div>
        </motion.section>

        {/* My Claws */}
        <section>
          <h2 className="font-coolvetica text-lg mb-3" style={{ color: '#31456a' }}>
            My Claws
          </h2>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl p-5"
            style={{
              background: '#e0e5ec',
              boxShadow: 'inset 4px 4px 8px #b3b7bd, inset -4px -4px 8px rgba(255,255,255,0.85)',
            }}
          >
            <div className="flex flex-col items-center text-center py-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
                style={{ background: '#e0e5ec', boxShadow: '4px 4px 12px #b3b7bd, -4px -4px 12px rgba(255,255,255,0.5)' }}
              >
                <Plus size={24} style={{ color: '#8a9bb0' }} />
              </div>
              <h3 className="font-inter font-semibold text-sm mb-1" style={{ color: '#31456a' }}>
                Deploy Your First Claw
              </h3>
              <p className="text-xs max-w-xs mb-2" style={{ color: '#8a9bb0' }}>
                Create an AI agent that operates across WhatsApp, Telegram,
                and the web. Fund it with WLD.
              </p>
              <p className="text-[10px] max-w-xs mb-4" style={{ color: '#b3b7bd' }}>
                All agents are linked to your World ID for accountability.
              </p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/create')}
                className="text-white text-sm font-medium px-6 py-3.5 rounded-full flex items-center gap-2 nm-btn-accent"
              >
                <Plus size={16} />
                Create Claw
              </motion.button>
            </div>
          </motion.div>
        </section>

        {/* Credits Dashboard */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Coins size={18} style={{ color: '#7b96f5' }} />
            <h2 className="font-coolvetica text-lg" style={{ color: '#31456a' }}>
              Credits
            </h2>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-3 gap-3"
          >
            {creditStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl p-3 text-center"
                style={{ background: '#e0e5ec', boxShadow: '4px 4px 12px #b3b7bd, -4px -4px 12px rgba(255,255,255,0.5)' }}
              >
                <p className="text-lg font-bold" style={{ color: '#31456a' }}>
                  {stat.value}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: '#8a9bb0' }}>{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </section>

        {/* Settings */}
        <section>
          <h2 className="font-coolvetica text-lg mb-3" style={{ color: '#31456a' }}>
            Settings
          </h2>
          <div className="space-y-3">
            {settingsLinks.map((link, i) => (
              <motion.button
                key={link.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.06 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (link.label === 'Report a Claw') setShowReportSheet(true);
                }}
                className="w-full rounded-xl p-4 flex items-center gap-3 text-left"
                style={{ background: '#e0e5ec', boxShadow: '4px 4px 12px #b3b7bd, -4px -4px 12px rgba(255,255,255,0.5)' }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{ boxShadow: 'inset 2px 2px 5px #b3b7bd, inset -2px -2px 5px rgba(255,255,255,0.85)' }}
                >
                  <link.icon size={16} style={{ color: link.iconColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-inter text-sm font-medium" style={{ color: '#31456a' }}>
                    {link.label}
                  </h3>
                  <p className="text-xs" style={{ color: '#8a9bb0' }}>{link.description}</p>
                </div>
                <ChevronRight size={16} style={{ color: '#b3b7bd' }} />
              </motion.button>
            ))}
          </div>
        </section>
      </Page.Main>

      {/* Report Sheet */}
      {showReportSheet && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(163, 177, 198, 0.5)' }}
          onClick={() => setShowReportSheet(false)}
        >
          <motion.div
            initial={{ y: 300 }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="rounded-t-3xl w-full max-w-lg p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
            style={{ background: '#e0e5ec', boxShadow: '-8px -8px 20px rgba(255,255,255,0.5), 4px 0 12px #b3b7bd' }}
          >
            <div
              className="w-10 h-1 rounded-full mx-auto mb-5"
              style={{ background: '#b3b7bd' }}
            />
            <h3 className="font-coolvetica text-xl mb-2" style={{ color: '#31456a' }}>
              Report a Claw
            </h3>
            <p className="text-sm mb-3" style={{ color: '#8a9bb0' }}>
              Enter the agent name and select a reason.
            </p>
            <input
              type="text"
              placeholder="agent-name.caas.eth"
              className="w-full px-4 py-3 text-sm outline-none rounded-xl mb-3"
              style={{
                background: '#e0e5ec',
                boxShadow: 'inset 4px 4px 8px #b3b7bd, inset -4px -4px 8px rgba(255,255,255,0.85)',
                color: '#31456a',
              }}
            />
            <div className="space-y-2">
              {[
                'Spam or abusive behavior',
                'Harmful or misleading content',
                'Unauthorized transactions',
                'Impersonation',
                'Other',
              ].map((reason) => (
                <button
                  key={reason}
                  onClick={() => setShowReportSheet(false)}
                  className="w-full text-left px-4 py-3 text-sm rounded-xl transition-all"
                  style={{
                    background: '#e0e5ec',
                    boxShadow: '3px 3px 8px #b3b7bd, -3px -3px 8px rgba(255,255,255,0.5)',
                    color: '#31456a',
                  }}
                >
                  {reason}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowReportSheet(false)}
              className="w-full mt-3 text-center py-3 text-sm"
              style={{ color: '#8a9bb0' }}
            >
              Cancel
            </button>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
