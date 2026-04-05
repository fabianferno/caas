'use client';

import { Page } from '@/components/PageLayout';
import { CaasLogo } from '@/components/CaasLogo';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Settings, X, Check } from 'lucide-react';
import { useState } from 'react';

/* ── Shadows ── */
const nmRaisedSm = { background: '#e0e5ec', boxShadow: '4px 4px 12px #b3b7bd, -4px -4px 12px rgba(255,255,255,0.5)' };
const nmInsetSm  = { background: '#e0e5ec', boxShadow: 'inset 3px 3px 8px #b3b7bd, inset -3px -3px 8px rgba(255,255,255,0.7)' };
const nmBtn      = { background: '#7b96f5', boxShadow: '6px 6px 16px rgba(80,100,190,0.55), -4px -4px 12px rgba(255,255,255,0.95)', color: '#ffffff' };

/* ── Service definitions ── */
type Service = {
  id: string;
  name: string;
  desc: string;
  category: string;
  color: string;
  icon: string; // emoji as placeholder — replaced by SVG brand colors
};

const SERVICES: Service[] = [
  { id: 'airbnb',    name: 'Airbnb',          desc: 'Book accommodation worldwide',         category: 'Travel',    color: '#FF5A5F', icon: '🏠' },
  { id: 'flights',   name: 'Flights',          desc: 'Search and book flights',              category: 'Travel',    color: '#007AFF', icon: '✈️' },
  { id: 'hotels',    name: 'Hotels',           desc: 'Reserve hotels and resorts',           category: 'Travel',    color: '#F5A623', icon: '🏨' },
  { id: 'uber',      name: 'Uber',             desc: 'Book rides and deliveries',            category: 'Transport', color: '#000000', icon: '🚗' },
  { id: 'doordash',  name: 'DoorDash',         desc: 'Order food from local restaurants',    category: 'Food',      color: '#FF3008', icon: '🍔' },
  { id: 'opentable', name: 'OpenTable',        desc: 'Reserve restaurant tables',            category: 'Food',      color: '#DA3743', icon: '🍽️' },
  { id: 'amazon',    name: 'Amazon',           desc: 'Shop and track packages',              category: 'Shopping',  color: '#FF9900', icon: '📦' },
  { id: 'calendly',  name: 'Calendly',         desc: 'Schedule meetings automatically',      category: 'Productivity', color: '#006BFF', icon: '📅' },
  { id: 'ticketmaster', name: 'Ticketmaster',  desc: 'Buy tickets for events',               category: 'Events',    color: '#026CDF', icon: '🎟️' },
  { id: 'booking',   name: 'Booking.com',      desc: 'Find stays and car rentals',           category: 'Travel',    color: '#003580', icon: '🛏️' },
];

const CATEGORIES = ['All', ...Array.from(new Set(SERVICES.map(s => s.category)))];

type ServiceState = { enabled: boolean; wldLimit: string };

export default function Marketplace() {
  const router = useRouter();

  const [filter,   setFilter]   = useState('All');
  const [states,   setStates]   = useState<Record<string, ServiceState>>(
    Object.fromEntries(SERVICES.map(s => [s.id, { enabled: false, wldLimit: '10' }]))
  );
  const [sheet, setSheet] = useState<Service | null>(null);
  const [limitDraft, setLimitDraft] = useState('');

  const toggleService = (id: string) =>
    setStates(prev => ({ ...prev, [id]: { ...prev[id], enabled: !prev[id].enabled } }));

  const openSettings = (s: Service) => {
    setLimitDraft(states[s.id].wldLimit);
    setSheet(s);
  };

  const saveLimit = () => {
    if (!sheet) return;
    const val = parseFloat(limitDraft);
    if (!isNaN(val) && val >= 0) {
      setStates(prev => ({ ...prev, [sheet.id]: { ...prev[sheet.id], wldLimit: String(val) } }));
    }
    setSheet(null);
  };

  const visible = SERVICES.filter(s => filter === 'All' || s.category === filter);
  const enabledCount = Object.values(states).filter(s => s.enabled).length;

  return (
    <>
      <Page.Header className="px-5 pt-6 pb-5" style={{ background: '#e0e5ec' } as React.CSSProperties}>
        <div className="flex items-center justify-between mb-3">
          <CaasLogo />
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => router.back()}
            className="w-10 h-10 rounded-2xl flex items-center justify-center" style={nmRaisedSm}>
            <ArrowLeft size={18} style={{ color: '#8a9bb0' }} />
          </motion.button>
        </div>
        <h1
          className="font-coolvetica text-[2rem] uppercase leading-none tracking-tight"
          style={{ color: '#e0e5ec', textShadow: '-2px -2px 4px #b3b7bd, 2px 2px 5px rgba(255,255,255,0.95)' }}
        >
          Marketplace
        </h1>
        {enabledCount > 0 && (
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] mt-1" style={{ color: '#7b96f5' }}>
            {enabledCount} service{enabledCount > 1 ? 's' : ''} active
          </p>
        )}
      </Page.Header>

      <Page.Main className="px-5 pt-4 pb-6 space-y-4" style={{ background: '#e0e5ec' } as React.CSSProperties}>

        {/* Category filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <motion.button
              key={cat}
              whileTap={{ scale: 0.94 }}
              onClick={() => setFilter(cat)}
              className="shrink-0 px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wide"
              style={filter === cat ? nmBtn : { ...nmInsetSm, color: '#8a9bb0' }}
            >
              {cat}
            </motion.button>
          ))}
        </div>

        {/* Service cards */}
        <div className="space-y-3">
          {visible.map((service, i) => {
            const state = states[service.id];
            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-2xl p-4 flex items-center gap-3"
                style={nmRaisedSm}
              >
                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={nmInsetSm}
                >
                  {service.icon}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-coolvetica text-[0.95rem] uppercase leading-none tracking-tight truncate" style={{ color: '#31456a' }}>
                      {service.name}
                    </p>
                    <span
                      className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0"
                      style={nmInsetSm}
                    >
                      <span style={{ color: '#b3b7bd' }}>{service.category}</span>
                    </span>
                  </div>
                  <p className="text-[11px] mt-0.5 truncate" style={{ color: '#8a9bb0' }}>{service.desc}</p>
                  {state.enabled && (
                    <p className="text-[9px] mt-1 font-semibold" style={{ color: '#7b96f5' }}>
                      Limit: {state.wldLimit} WLD
                    </p>
                  )}
                </div>

                {/* Settings icon */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => openSettings(service)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={nmInsetSm}
                >
                  <Settings size={13} style={{ color: state.enabled ? '#7b96f5' : '#b3b7bd' }} />
                </motion.button>

                {/* Toggle */}
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={() => toggleService(service.id)}
                  className="w-12 h-6 rounded-full relative shrink-0"
                  style={state.enabled
                    ? { background: '#7b96f5', boxShadow: 'inset 2px 2px 4px rgba(60,80,180,0.3)' }
                    : nmInsetSm
                  }
                >
                  <motion.div
                    animate={{ x: state.enabled ? 24 : 2 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                    className="absolute top-[3px] w-[18px] h-[18px] rounded-full"
                    style={state.enabled
                      ? { background: '#fff', boxShadow: '1px 1px 3px rgba(0,0,0,0.15)' }
                      : { background: '#e0e5ec', boxShadow: '2px 2px 4px #b3b7bd, -1px -1px 3px rgba(255,255,255,0.9)' }
                    }
                  />
                </motion.button>
              </motion.div>
            );
          })}
        </div>
      </Page.Main>

      {/* ── Settings sheet ── */}
      <AnimatePresence>
        {sheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: 'rgba(163,177,198,0.5)' }}
            onClick={() => setSheet(null)}
          >
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              transition={{ type: 'spring', damping: 28, stiffness: 340 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg rounded-t-3xl px-6 pt-5 pb-[max(env(safe-area-inset-bottom),24px)]"
              style={{ background: '#e0e5ec', boxShadow: '-6px -6px 20px rgba(255,255,255,0.6), 0 -2px 12px #b3b7bd' }}
            >
              {/* Handle */}
              <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: '#b3b7bd' }} />

              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={nmInsetSm}>
                  {sheet.icon}
                </div>
                <div>
                  <p className="font-coolvetica text-[1.1rem] uppercase leading-none" style={{ color: '#31456a' }}>
                    {sheet.name}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: '#8a9bb0' }}>Spending limit</p>
                </div>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setSheet(null)}
                  className="ml-auto w-8 h-8 rounded-xl flex items-center justify-center" style={nmRaisedSm}>
                  <X size={14} style={{ color: '#8a9bb0' }} />
                </motion.button>
              </div>

              {/* WLD limit input */}
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] mb-2" style={{ color: '#8a9bb0' }}>
                Max WLD per transaction
              </p>
              <div className="rounded-2xl overflow-hidden mb-2" style={nmInsetSm}>
                <div className="flex items-center px-5">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={limitDraft}
                    onChange={e => setLimitDraft(e.target.value)}
                    className="flex-1 bg-transparent py-4 text-[18px] font-medium outline-none"
                    style={{ color: '#31456a' }}
                  />
                  <span className="text-[14px] font-bold shrink-0" style={{ color: '#b3b7bd' }}>WLD</span>
                </div>
              </div>
              <p className="text-[10px] mb-5" style={{ color: '#b3b7bd' }}>
                Your agent will not exceed this limit per action on {sheet.name}.
              </p>

              {/* Preset chips */}
              <div className="flex gap-2 mb-5">
                {['1', '5', '10', '25', '50'].map(v => (
                  <motion.button key={v} whileTap={{ scale: 0.92 }} onClick={() => setLimitDraft(v)}
                    className="flex-1 py-2 rounded-xl text-[11px] font-bold"
                    style={limitDraft === v ? nmBtn : { ...nmInsetSm, color: '#8a9bb0' }}>
                    {v}
                  </motion.button>
                ))}
              </div>

              {/* Save */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={saveLimit}
                className="w-full h-14 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2"
                style={nmBtn}
              >
                <Check size={16} /> Save Limit
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
