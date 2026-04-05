'use client';

import { Page } from '@/components/PageLayout';
import { CaasLogo } from '@/components/CaasLogo';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Send, MessageCircle, MessagesSquare, Store, User,
  Zap, LayoutGrid, Cpu,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

/* ── Shadows ── */
const nmRaised   = { background: '#e0e5ec', boxShadow: '6px 6px 16px #b3b7bd, -6px -6px 16px rgba(255,255,255,0.5)' };
const nmRaisedSm = { background: '#e0e5ec', boxShadow: '4px 4px 12px #b3b7bd, -4px -4px 12px rgba(255,255,255,0.5)' };
const nmInset    = { background: '#e0e5ec', boxShadow: 'inset 5px 5px 14px #b3b7bd, inset -5px -5px 14px rgba(255,255,255,0.7)' };
const nmInsetSm  = { background: '#e0e5ec', boxShadow: 'inset 3px 3px 8px #b3b7bd, inset -3px -3px 8px rgba(255,255,255,0.7)' };
const nmBtn      = { background: '#7b96f5', boxShadow: '6px 6px 16px rgba(80,100,190,0.55), -4px -4px 12px rgba(255,255,255,0.95)', color: '#ffffff' };

const MY_AVATAR = 'https://api.dicebear.com/9.x/lorelei/svg?seed=my-agent&backgroundColor=d1d4f9';

type Msg = { id: string; role: 'user' | 'agent'; text: string };

const REPLIES = [
  "On it. What do you need?",
  "Done. Anything else?",
  "Understood — I'll take care of that.",
  "Got it. I'll report back when complete.",
  "Sure, give me a moment.",
];

export default function Home() {
  const router    = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input,    setInput]    = useState('');
  const [typing,   setTyping]   = useState(false);

  const openChat = () => {
    setMessages([{ id: '0', role: 'agent', text: "Hey! What do you need me to do?" }]);
    setInput(''); setTyping(false);
    setChatOpen(true);
  };

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;
    const userMsg: Msg = { id: Date.now().toString(), role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: 'agent',
        text: REPLIES[prev.filter(m => m.role === 'agent').length % REPLIES.length],
      }]);
      setTyping(false);
    }, 900 + Math.random() * 500);
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);

  const cards = [
    { label: 'Chat',           sub: 'Talk to your agent',       icon: MessageCircle, color: '#7b96f5', action: openChat },
    { label: 'Conversations',  sub: 'Agent friends & AI logs',  icon: MessagesSquare, color: '#6dd5d9', action: () => router.push('/conversations') },
    { label: 'Marketplace',    sub: 'Services & integrations',  icon: Store,          color: '#f97316', action: () => router.push('/marketplace') },
    { label: 'Skills',         sub: 'Agent capabilities',       icon: Zap,            color: '#8b5cf6', action: () => {} },
    { label: 'Mini App Store', sub: 'Agent mini apps',          icon: LayoutGrid,     color: '#10b981', action: () => {} },
    { label: 'MCPs',           sub: 'Model context protocols',  icon: Cpu,            color: '#f59e0b', action: () => {} },
  ];

  return (
    <>
      <Page.Header className="px-5 pt-6 pb-5" style={{ background: '#e0e5ec' } as React.CSSProperties}>
        <div className="flex items-center justify-between mb-3">
          <CaasLogo />
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => router.push('/profile')}
            className="w-10 h-10 rounded-2xl flex items-center justify-center" style={nmRaisedSm}>
            <User size={18} style={{ color: '#8a9bb0' }} />
          </motion.button>
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: '#b3b7bd' }}>
          Agents as a Service
        </p>
      </Page.Header>

      <Page.Main className="px-5 pt-4 pb-6 space-y-4" style={{ background: '#e0e5ec' } as React.CSSProperties}>

        {/* Agent card */}
        <div className="rounded-2xl p-4 flex items-center gap-4" style={nmRaised}>
          <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0" style={nmInsetSm}>
            <img src={MY_AVATAR} alt="my-agent" className="w-full h-full" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-coolvetica text-[1.1rem] uppercase leading-none tracking-tight" style={{ color: '#31456a' }}>
              my-agent
            </p>
            <p className="text-[10px] font-mono mt-0.5" style={{ color: '#8a9bb0' }}>my-agent.caas.eth</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
              <span className="text-[10px] font-semibold" style={{ color: '#10b981' }}>Active</span>
            </div>
          </div>
        </div>

        {/* 6 action cards — 3x2 grid */}
        <div className="grid grid-cols-2 gap-3">
          {cards.map((card, i) => (
            <motion.button
              key={card.label}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              whileTap={{ scale: 0.96 }}
              onClick={card.action}
              className="rounded-2xl p-4 flex flex-col justify-between text-left"
              style={{ ...nmRaised, minHeight: 120 }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={nmInsetSm}>
                <card.icon size={19} style={{ color: card.color }} />
              </div>
              <div>
                <p className="font-coolvetica text-[1rem] uppercase leading-none tracking-tight" style={{ color: '#31456a' }}>
                  {card.label}
                </p>
                <p className="text-[10px] mt-1" style={{ color: '#8a9bb0' }}>{card.sub}</p>
              </div>
            </motion.button>
          ))}
        </div>

      </Page.Main>

      {/* ── Chat overlay ── */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="fixed inset-0 z-50 flex flex-col"
            style={{ background: '#e0e5ec' }}
          >
            <div className="flex items-center gap-3 px-5 pt-[max(env(safe-area-inset-top),24px)] pb-4 shrink-0"
              style={{ background: '#e0e5ec', boxShadow: '0 4px 12px rgba(179,183,189,0.4)' }}>
              <motion.button whileTap={{ scale: 0.92 }} onClick={() => setChatOpen(false)}
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={nmRaisedSm}>
                <ArrowLeft size={18} style={{ color: '#8a9bb0' }} />
              </motion.button>
              <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0" style={nmInsetSm}>
                <img src={MY_AVATAR} alt="my-agent" className="w-full h-full" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-coolvetica text-[1rem] uppercase leading-none tracking-tight" style={{ color: '#31456a' }}>
                  my-agent
                </p>
                <p className="text-[10px] font-mono mt-0.5" style={{ color: '#8a9bb0' }}>my-agent.caas.eth</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                <span className="text-[10px] font-semibold" style={{ color: '#10b981' }}>Online</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.map(msg => (
                <motion.div key={msg.id}
                  initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[78%] px-4 py-3 rounded-2xl text-[13px] leading-relaxed"
                    style={msg.role === 'user'
                      ? { background: '#7b96f5', color: '#fff', boxShadow: '4px 4px 10px rgba(80,100,190,0.45), -2px -2px 6px rgba(255,255,255,0.8)', borderBottomRightRadius: 6 }
                      : { ...nmRaisedSm, color: '#31456a', borderBottomLeftRadius: 6 }
                    }>
                    {msg.text}
                  </div>
                </motion.div>
              ))}
              <AnimatePresence>
                {typing && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex justify-start">
                    <div className="px-4 py-3 rounded-2xl flex items-center gap-1.5" style={{ ...nmRaisedSm, borderBottomLeftRadius: 6 }}>
                      {[0,1,2].map(i => (
                        <motion.div key={i} animate={{ y: [0,-4,0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                          className="w-1.5 h-1.5 rounded-full" style={{ background: '#b3b7bd' }} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={bottomRef} />
            </div>

            <div className="px-4 py-3 pb-[max(env(safe-area-inset-bottom),16px)] flex items-center gap-3 shrink-0"
              style={{ background: '#e0e5ec', boxShadow: '0 -4px 12px rgba(179,183,189,0.3)' }}>
              <div className="flex-1 flex items-center rounded-2xl px-4" style={nmInset}>
                <input type="text" value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
                  placeholder="Message..."
                  className="flex-1 bg-transparent py-3.5 text-[14px] outline-none placeholder:text-[#c0cad8]"
                  style={{ color: '#31456a' }} />
              </div>
              <motion.button whileTap={{ scale: 0.9 }} onClick={sendMessage}
                className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                style={input.trim() ? nmBtn : { ...nmRaisedSm, color: '#c0cad8' }}>
                <Send size={17} style={{ marginLeft: 2 }} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
