'use client';

import { Page } from '@/components/PageLayout';
import { VerificationBadge } from '@/components/VerificationBadge';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
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
  },
  {
    label: 'Channels',
    description: 'Manage WhatsApp, Telegram, and web integrations',
    icon: MessageSquareShare,
  },
  {
    label: 'Privacy',
    description: 'Control access and data sharing',
    icon: Lock,
  },
  {
    label: 'Transfers',
    description: 'Transfer agent ownership',
    icon: ArrowRightLeft,
  },
  {
    label: 'Report a Claw',
    description: 'Flag abusive or harmful agents',
    icon: Flag,
  },
];

export default function Profile() {
  const router = useRouter();
  const [showReportSheet, setShowReportSheet] = useState(false);

  return (
    <>
      <Page.Header className="bg-background px-5 pt-5 pb-2">
        <div className="flex items-center justify-between">
          <h1 className="font-coolvetica text-2xl text-foreground tracking-tight">
            Profile
          </h1>
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-full bg-surface"
          >
            <Settings size={18} className="text-muted-foreground" />
          </motion.button>
        </div>
      </Page.Header>

      <Page.Main className="bg-background pb-28 px-5 pt-4 space-y-5">
        {/* User Info */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card-bg rounded-2xl p-5 border border-surface-dark/50"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center">
              <span className="text-white font-bold text-lg">You</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <VerificationBadge status="self" size="md" showLabel />
              </div>
              <div className="flex items-center gap-1.5">
                <Wallet size={13} className="text-muted-foreground" />
                <p className="text-xs text-muted-foreground font-mono">
                  0x1234...5678
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                Verified human · Agent operator
              </p>
            </div>
          </div>
        </motion.section>

        {/* My Claws */}
        <section>
          <h2 className="font-coolvetica text-lg text-foreground mb-3">
            My Claws
          </h2>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card-bg rounded-2xl p-5 border border-surface-dark/50 border-dashed"
          >
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-14 h-14 rounded-full bg-surface flex items-center justify-center mb-3">
                <Plus size={24} className="text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-sm text-foreground mb-1">
                Deploy Your First Claw
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs mb-2">
                Create an AI agent that operates across WhatsApp, Telegram,
                and the web. Fund it with WLD.
              </p>
              <p className="text-[10px] text-muted-foreground/60 max-w-xs mb-4">
                All agents are linked to your World ID for accountability.
              </p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/create')}
                className="bg-accent text-white text-sm font-medium px-6 py-2.5 rounded-full flex items-center gap-2"
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
            <Coins size={18} className="text-accent" />
            <h2 className="font-coolvetica text-lg text-foreground">
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
                className="bg-card-bg rounded-xl p-3 border border-surface-dark/50 text-center"
              >
                <p className="text-lg font-bold text-foreground">
                  {stat.value}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </section>

        {/* Settings */}
        <section>
          <h2 className="font-coolvetica text-lg text-foreground mb-3">
            Settings
          </h2>
          <div className="space-y-2">
            {settingsLinks.map((link, i) => (
              <motion.button
                key={link.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.06 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (link.label === 'Report a Claw') {
                    setShowReportSheet(true);
                  }
                }}
                className="w-full bg-card-bg rounded-xl p-4 border border-surface-dark/50 flex items-center gap-3 text-left"
              >
                <div className="w-9 h-9 rounded-full bg-surface flex items-center justify-center shrink-0">
                  <link.icon size={16} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-foreground">
                    {link.label}
                  </h3>
                  <p className="text-xs text-muted-foreground">{link.description}</p>
                </div>
                <ChevronRight size={16} className="text-surface-dark" />
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
          className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
          onClick={() => setShowReportSheet(false)}
        >
          <motion.div
            initial={{ y: 300 }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card-bg rounded-t-3xl w-full max-w-lg p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
          >
            <div className="w-10 h-1 bg-surface-dark rounded-full mx-auto mb-5" />
            <h3 className="font-coolvetica text-xl text-foreground mb-2">
              Report a Claw
            </h3>
            <p className="text-sm text-muted-foreground mb-2">
              Enter the agent name and select a reason.
            </p>
            <input
              type="text"
              placeholder="agent-name.caas.eth"
              className="w-full bg-surface rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-accent/30 transition-all mb-3"
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
                  className="w-full text-left bg-surface rounded-xl px-4 py-3 text-sm text-foreground hover:bg-surface-dark transition-colors"
                >
                  {reason}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowReportSheet(false)}
              className="w-full mt-3 text-center py-3 text-sm text-muted-foreground"
            >
              Cancel
            </button>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
