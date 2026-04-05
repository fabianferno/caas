'use client';

import { Page } from '@/components/PageLayout';
import { CaasLogo } from '@/components/CaasLogo';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Zap, Check } from 'lucide-react';
import { useState, useEffect } from 'react';

/* ── Shadows (match existing pages) ── */
const nmRaisedSm = { background: '#e0e5ec', boxShadow: '4px 4px 12px #b3b7bd, -4px -4px 12px rgba(255,255,255,0.5)' };
const nmInsetSm  = { background: '#e0e5ec', boxShadow: 'inset 3px 3px 8px #b3b7bd, inset -3px -3px 8px rgba(255,255,255,0.7)' };
const nmBtn      = { background: '#7b96f5', boxShadow: '6px 6px 16px rgba(80,100,190,0.55), -4px -4px 12px rgba(255,255,255,0.95)', color: '#ffffff' };
const nmBtnGreen = { background: '#10b981', boxShadow: '6px 6px 16px rgba(16,185,129,0.4), -4px -4px 12px rgba(255,255,255,0.95)', color: '#ffffff' };

interface AgentMiniApp {
  _id: string;
  status: 'live' | 'offline';
  app: {
    name: string;
    description: string;
    icon: string;
    category: string;
    url: string;
    developer: string;
    version: string;
  };
  skills: Array<{
    id: string;
    name: string;
    description: string;
    price: string;
    method: string;
    route: string;
  }>;
}

function priceRange(skills: AgentMiniApp['skills']): string {
  if (skills.length === 0) return 'Free';
  const prices = skills.map(s => parseFloat(s.price)).filter(p => !isNaN(p));
  if (prices.length === 0) return 'Free';
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? `${min} WLD/call` : `${min}-${max} WLD/call`;
}

export default function MiniAppStore() {
  const router = useRouter();
  const [apps, setApps] = useState<AgentMiniApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<AgentMiniApp | null>(null);

  useEffect(() => {
    fetch('/api/agent-apps')
      .then(r => r.json())
      .then((data: AgentMiniApp[]) => { setApps(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const toggleEnable = (id: string) => {
    setEnabled(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <>
      <Page.Header className="px-5 pt-6 pb-5" style={{ background: '#e0e5ec', boxShadow: '0 4px 12px rgba(179,183,189,0.35)' } as React.CSSProperties}>
        <div className="flex items-center justify-between">
          <div>
            <CaasLogo />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] mt-1" style={{ color: '#8a9bb0' }}>
              Mini App Store
            </p>
          </div>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => router.back()}
            className="w-10 h-10 rounded-2xl flex items-center justify-center" style={nmRaisedSm}>
            <ArrowLeft size={18} style={{ color: '#8a9bb0' }} />
          </motion.button>
        </div>
      </Page.Header>

      <Page.Main className="px-5 py-5">
        {loading && (
          <div className="flex items-center justify-center h-40">
            <p className="text-[13px]" style={{ color: '#8a9bb0' }}>Loading apps...</p>
          </div>
        )}

        {!loading && apps.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <p className="text-[15px] font-coolvetica uppercase" style={{ color: '#31456a' }}>No apps registered yet</p>
            <p className="text-[12px] text-center" style={{ color: '#8a9bb0' }}>
              Mini apps using @caas/agent-mini-app will appear here.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {apps.map((app, i) => (
            <motion.div
              key={app._id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-2xl p-4"
              style={nmRaisedSm}
            >
              <div className="flex items-start gap-3 mb-3">
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden" style={nmInsetSm}>
                  {app.app.icon
                    ? <img src={app.app.icon} alt={app.app.name} className="w-8 h-8 object-contain" />
                    : <span className="text-xl">{app.app.name[0]}</span>
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-coolvetica text-[0.95rem] uppercase leading-none tracking-tight" style={{ color: '#31456a' }}>
                      {app.app.name}
                    </p>
                    <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0" style={nmInsetSm}>
                      <span style={{ color: '#b3b7bd' }}>{app.app.category}</span>
                    </span>
                    {/* Live dot */}
                    <span className="flex items-center gap-1 ml-auto shrink-0">
                      <span className={`w-1.5 h-1.5 rounded-full ${app.status === 'live' ? 'bg-emerald-400' : 'bg-gray-400'}`} />
                      <span className="text-[9px] font-bold uppercase" style={{ color: app.status === 'live' ? '#10b981' : '#b3b7bd' }}>
                        {app.status}
                      </span>
                    </span>
                  </div>
                  <p className="text-[11px] mt-0.5" style={{ color: '#8a9bb0' }}>by {app.app.developer}</p>
                </div>
              </div>

              <p className="text-[12px] mb-3 leading-relaxed" style={{ color: '#5a6e8a' }}>
                {app.app.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-[11px]" style={{ color: '#8a9bb0' }}>
                    <Zap size={11} />
                    {app.skills.length} skill{app.skills.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-[11px]" style={{ color: '#8a9bb0' }}>
                    {priceRange(app.skills)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setDetail(app)}
                    className="px-3 py-2 rounded-xl text-[11px] font-bold"
                    style={nmInsetSm}
                  >
                    <span style={{ color: '#8a9bb0' }}>Details</span>
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleEnable(app._id)}
                    className="px-3 py-2 rounded-xl text-[11px] font-bold flex items-center gap-1"
                    style={enabled.has(app._id) ? nmBtnGreen : nmBtn}
                  >
                    {enabled.has(app._id) && <Check size={11} />}
                    {enabled.has(app._id) ? 'Enabled' : 'Enable'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Page.Main>

      {/* Detail sheet */}
      <AnimatePresence>
        {detail && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end"
            style={{ background: 'rgba(49,69,106,0.35)' }}
            onClick={() => setDetail(null)}
          >
            <motion.div
              initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
              transition={{ type: 'spring', damping: 28, stiffness: 340 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg rounded-t-3xl px-6 pt-5 pb-[max(env(safe-area-inset-bottom),24px)]"
              style={{ background: '#e0e5ec', boxShadow: '-6px -6px 20px rgba(255,255,255,0.6), 0 -2px 12px #b3b7bd' }}
            >
              <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: '#b3b7bd' }} />
              <p className="font-coolvetica text-[1.1rem] uppercase mb-1" style={{ color: '#31456a' }}>{detail.app.name}</p>
              <p className="text-[11px] mb-4" style={{ color: '#8a9bb0' }}>by {detail.app.developer} &middot; v{detail.app.version}</p>
              <p className="text-[12px] font-bold uppercase tracking-[0.12em] mb-2" style={{ color: '#8a9bb0' }}>Skills</p>
              <div className="flex flex-col gap-2 mb-5">
                {detail.skills.map(s => (
                  <div key={s.id} className="rounded-xl p-3 flex items-center justify-between" style={nmInsetSm}>
                    <div>
                      <p className="text-[12px] font-bold" style={{ color: '#31456a' }}>{s.name}</p>
                      <p className="text-[10px]" style={{ color: '#8a9bb0' }}>{s.description}</p>
                    </div>
                    <span className="text-[11px] font-bold shrink-0 ml-3" style={{ color: '#7b96f5' }}>{s.price} WLD</span>
                  </div>
                ))}
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => { toggleEnable(detail._id); setDetail(null); }}
                className="w-full h-14 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2"
                style={enabled.has(detail._id) ? nmBtnGreen : nmBtn}
              >
                {enabled.has(detail._id) ? <><Check size={16} /> Enabled for Agent</> : 'Enable for Agent'}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
