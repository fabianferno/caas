'use client';

import { Page } from '@/components/PageLayout';
import { CaasLogo } from '@/components/CaasLogo';
import { motion } from 'framer-motion';
import { Settings, ArrowDownLeft, ArrowUpRight, TrendingUp } from 'lucide-react';
import { useState } from 'react';

const nmRaised   = { background: '#e0e5ec', boxShadow: '6px 6px 16px #b3b7bd, -6px -6px 16px rgba(255,255,255,0.5)' };
const nmRaisedSm = { background: '#e0e5ec', boxShadow: '4px 4px 12px #b3b7bd, -4px -4px 12px rgba(255,255,255,0.5)' };
const nmInset    = { background: '#e0e5ec', boxShadow: 'inset 5px 5px 14px #b3b7bd, inset -5px -5px 14px rgba(255,255,255,0.7)' };
const nmInsetSm  = { background: '#e0e5ec', boxShadow: 'inset 3px 3px 8px #b3b7bd, inset -3px -3px 8px rgba(255,255,255,0.7)' };

/* Placeholder sparkline points — will be replaced with real data */
const SPARKLINE = [30, 45, 28, 60, 42, 75, 55, 80, 62, 90, 70, 95];
const MAX = Math.max(...SPARKLINE);
const W = 280;
const H = 72;
const points = SPARKLINE.map((v, i) => {
  const x = (i / (SPARKLINE.length - 1)) * W;
  const y = H - (v / MAX) * H;
  return `${x},${y}`;
}).join(' ');

const TRANSACTIONS = [
  { id: '1', label: 'Compute usage',     amount: '-0.12 WLD', type: 'out', time: '2m ago'   },
  { id: '2', label: 'Top-up',            amount: '+5.00 WLD', type: 'in',  time: '1h ago'   },
  { id: '3', label: 'Telegram message',  amount: '-0.01 WLD', type: 'out', time: '3h ago'   },
  { id: '4', label: 'Compute usage',     amount: '-0.08 WLD', type: 'out', time: 'Yesterday' },
  { id: '5', label: 'Top-up',            amount: '+2.00 WLD', type: 'in',  time: 'Yesterday' },
];

export default function Profile() {
  const [range, setRange] = useState('7D');

  return (
    <>
      <Page.Header className="px-5 pt-6 pb-5" style={{ background: '#e0e5ec' } as React.CSSProperties}>
        <div className="flex items-center justify-between mb-3">
          <CaasLogo />
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={nmRaisedSm}
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

      <Page.Main className="pb-24 px-5 pt-5 space-y-5" style={{ background: '#e0e5ec' } as React.CSSProperties}>

        {/* Agent identity */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 flex items-center gap-4"
          style={nmRaised}
        >
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl shrink-0 overflow-hidden" style={nmInsetSm}>
            <img
              src="https://api.dicebear.com/9.x/lorelei/svg?seed=my-agent&backgroundColor=d1d4f9"
              alt="agent avatar"
              className="w-full h-full"
            />
          </div>

          <div className="flex-1 min-w-0">
            <p
              className="font-coolvetica text-[1.3rem] uppercase leading-none tracking-tight truncate"
              style={{ color: '#31456a' }}
            >
              my-agent
            </p>
            <p className="text-[11px] font-mono mt-1 truncate" style={{ color: '#8a9bb0' }}>
              my-agent.caas.eth
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: '#10b981', boxShadow: '0 0 6px #10b981' }}
              />
              <span className="text-[10px] font-semibold" style={{ color: '#10b981' }}>Active</span>
            </div>
          </div>
        </motion.div>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-3 gap-3"
        >
          {[
            { label: 'Balance',     value: '0 WLD' },
            { label: 'This Week',   value: '0 WLD' },
            { label: 'Total Spent', value: '0 WLD' },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl p-3 text-center" style={nmRaisedSm}>
              <p className="font-coolvetica text-[1.05rem] leading-none" style={{ color: '#31456a' }}>
                {stat.value}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-wider mt-1" style={{ color: '#b3b7bd' }}>
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>

        {/* Transaction graph */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl p-5"
          style={nmRaised}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} style={{ color: '#7b96f5' }} />
              <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: '#8a9bb0' }}>
                Activity
              </p>
            </div>
            <div className="flex gap-2">
              {['7D', '30D', 'All'].map(r => (
                <motion.button
                  key={r}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setRange(r)}
                  className="px-4 py-2 rounded-xl text-[11px] font-bold uppercase"
                  style={range === r
                    ? { background: '#7b96f5', color: '#fff', boxShadow: '3px 3px 8px rgba(123,150,245,0.5), -1px -1px 4px rgba(255,255,255,0.9)' }
                    : { ...nmInsetSm, color: '#b3b7bd' }
                  }
                >
                  {r}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Sparkline */}
          <div className="rounded-xl px-2 py-3" style={nmInset}>
            <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height: 72 }}>
              {/* Fill */}
              <defs>
                <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7b96f5" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#7b96f5" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polyline
                points={`0,${H} ${points} ${W},${H}`}
                fill="url(#sparkFill)"
                stroke="none"
              />
              <polyline
                points={points}
                fill="none"
                stroke="#7b96f5"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="flex justify-between mt-2 px-1">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                <span key={d} className="text-[8px] font-bold uppercase" style={{ color: '#c8d0e0' }}>{d}</span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] mb-3" style={{ color: '#8a9bb0' }}>
            Transactions
          </p>
          <div className="space-y-2.5">
            {TRANSACTIONS.map((tx, i) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.18 + i * 0.05 }}
                className="rounded-xl px-4 py-3.5 flex items-center gap-3"
                style={nmRaisedSm}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={nmInsetSm}
                >
                  {tx.type === 'in'
                    ? <ArrowDownLeft size={14} style={{ color: '#10b981' }} />
                    : <ArrowUpRight  size={14} style={{ color: '#8a9bb0' }} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium truncate" style={{ color: '#31456a' }}>{tx.label}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#b3b7bd' }}>{tx.time}</p>
                </div>
                <span
                  className="text-[12px] font-bold tabular shrink-0"
                  style={{ color: tx.type === 'in' ? '#10b981' : '#8a9bb0' }}
                >
                  {tx.amount}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

      </Page.Main>
    </>
  );
}
