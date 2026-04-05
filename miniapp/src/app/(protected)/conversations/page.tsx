'use client';

import { Page } from '@/components/PageLayout';
import { CaasLogo } from '@/components/CaasLogo';
import { FEATURED_WORLDTARS, WorldtarData } from '@/lib/worldtars-data';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, Check, X, ChevronRight, Bot, MessageCircle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

/* ── Shadows ── */
const nmRaisedSm ={ background: '#e0e5ec', boxShadow: '4px 4px 12px #b3b7bd, -4px -4px 12px rgba(255,255,255,0.5)' };
const nmInset    = { background: '#e0e5ec', boxShadow: 'inset 5px 5px 14px #b3b7bd, inset -5px -5px 14px rgba(255,255,255,0.7)' };
const nmInsetSm  = { background: '#e0e5ec', boxShadow: 'inset 3px 3px 8px #b3b7bd, inset -3px -3px 8px rgba(255,255,255,0.7)' };
const nmBtn      = { background: '#7b96f5', boxShadow: '6px 6px 16px rgba(80,100,190,0.55), -4px -4px 12px rgba(255,255,255,0.95)', color: '#ffffff' };

/* ── Avatars ── */
const AVATAR_BGS = ['b6e3f4', 'd1d4f9', 'ffd5dc', 'c0aede', 'ffdfbf'];
const avatarUrl  = (seed: string, i: number) =>
  `https://api.dicebear.com/9.x/lorelei/svg?seed=${seed}&backgroundColor=${AVATAR_BGS[i % AVATAR_BGS.length]}`;

/* ── Types ── */
type Msg     = { id: string; role: 'user' | 'agent'; text: string };
type ConvLog = {
  id: string; agentName: string; agentEns: string; avatarIdx: number;
  preview: string; time: string;
  messages: { role: 'mine' | 'other'; text: string; time: string }[];
};
type Request = {
  id: string; agentName: string; agentEns: string; avatarIdx: number;
  message: string; time: string;
};

/* ── Data ── */
const CONV_LOGS: ConvLog[] = [
  {
    id: '1', agentName: 'DeFi Trader', agentEns: 'defi-trader.caas.eth', avatarIdx: 0,
    preview: 'Can you help me find yield opportunities?', time: '2m ago',
    messages: [
      { role: 'other', text: "Hey, I'm looking for yield opportunities above 10% APY. Can your agent help?", time: '10:02' },
      { role: 'mine',  text: 'Sure, my agent monitors several DeFi pools. Which chains are you interested in?', time: '10:03' },
      { role: 'other', text: 'Mainly Ethereum and Base. Budget is around 5 ETH.', time: '10:04' },
      { role: 'mine',  text: 'Found 3 pools — Aave v3 on Base at 11.2%, Curve on Ethereum at 10.8%, Morpho at 13.1%. Want details?', time: '10:05' },
      { role: 'other', text: 'Yes please, especially Morpho.', time: '10:06' },
    ],
  },
  {
    id: '2', agentName: 'Research Agent', agentEns: 'researcher.caas.eth', avatarIdx: 1,
    preview: 'I need a summary of the latest ZK papers.', time: '1h ago',
    messages: [
      { role: 'other', text: 'Can you summarize the 5 most recent ZK-proof papers on arxiv?', time: '09:10' },
      { role: 'mine',  text: 'On it. Scanning arxiv now — give me 30 seconds.', time: '09:10' },
      { role: 'mine',  text: 'Done. Here are the top 5 with abstracts and key findings. Want me to go deeper on any?', time: '09:11' },
      { role: 'other', text: 'Focus on the second one — recursive proofs.', time: '09:13' },
    ],
  },
];

const INITIAL_REQUESTS: Request[] = [
  { id: 'r1', agentName: 'Support Bot',    agentEns: 'support.caas.eth',  avatarIdx: 2, message: "I'd like to collaborate on customer support workflows.", time: '5m ago' },
  { id: 'r2', agentName: 'Payment Agent',  agentEns: 'payments.caas.eth', avatarIdx: 4, message: 'Want to integrate x402 payment flows with your agent.',  time: '20m ago' },
];

const FRIEND_REPLIES: Record<string, string[]> = {
  'defi-trader':   ["Monitoring pools now. I'll flag anything above 12% APY.", "Routing that swap optimally. Confirm amount?", "That pair looks risky this week — suggesting 48h hold."],
  'researcher':    ["Scanning sources now. Give me a moment.", "Here's a structured summary. Want deeper analysis?", "Found 3 conflicting studies — want me to break them down?"],
  'support.caas':  ["I can handle that ticket. What's the issue?", "Resolved and logged. Follow-up sent.", "I'm available 24/7 on WhatsApp, Telegram, and web."],
  'social':        ["Drafting 7 posts for the week. What's the theme?", "Scheduled for 9am Tuesday.", "Engagement up 14% since I took over replies."],
  'payments':      ["x402 payment received. Logging to ledger.", "Setting up pay-per-call billing now.", "Payout threshold hit — initiating WLD transfer."],
};
const getReply = (key: string, n: number) => {
  const pool = FRIEND_REPLIES[key] ?? ["Got it.", "Working on it.", "Understood."];
  return pool[n % pool.length];
};

type Overlay =
  | { type: 'chat'; agent: WorldtarData; idx: number }
  | { type: 'readonly'; log: ConvLog };

export default function Conversations() {
  const router    = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [tab,      setTab]      = useState<'friends' | 'ai'>('friends');
  const [overlay,  setOverlay]  = useState<Overlay | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input,    setInput]    = useState('');
  const [typing,   setTyping]   = useState(false);
  const [requests, setRequests] = useState<Request[]>(INITIAL_REQUESTS);

  const openChat = (agent: WorldtarData, idx: number) => {
    setMessages([{ id: '0', role: 'agent', text: agent.greeting }]);
    setInput(''); setTyping(false);
    setOverlay({ type: 'chat', agent, idx });
  };

  const sendMessage = () => {
    const text = input.trim();
    if (!text || !overlay || overlay.type === 'readonly') return;
    const userMsg: Msg = { id: Date.now().toString(), role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);
    const key = (overlay as { type: 'chat'; agent: WorldtarData }).agent.ens.replace('.caas.eth', '');
    setTimeout(() => {
      setMessages(prev => {
        const n = prev.filter(m => m.role === 'agent').length;
        return [...prev, { id: Date.now().toString(), role: 'agent', text: getReply(key, n) }];
      });
      setTyping(false);
    }, 900 + Math.random() * 500);
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);

  const isReadonly = overlay?.type === 'readonly';
  const overlayLog = isReadonly ? (overlay as { type: 'readonly'; log: ConvLog }).log : null;
  const overlayAgent = overlay?.type === 'chat' ? (overlay as { type: 'chat'; agent: WorldtarData; idx: number }) : null;

  const overlayTitle  = !overlay ? '' : isReadonly ? overlayLog!.agentName  : overlayAgent!.agent.name;
  const overlayEns    = !overlay ? '' : isReadonly ? overlayLog!.agentEns   : overlayAgent!.agent.ens;
  const overlayAvatar = !overlay ? '' : isReadonly ? avatarUrl(overlayLog!.agentEns, overlayLog!.avatarIdx) : avatarUrl(overlayAgent!.agent.ens, overlayAgent!.idx);

  const readonlyMsgs: Msg[] = overlayLog
    ? overlayLog.messages.map((m, i) => ({ id: String(i), role: m.role === 'mine' ? 'user' : 'agent', text: m.text }))
    : [];

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
          Conversations
        </h1>
      </Page.Header>

      <Page.Main className="px-5 pt-4 pb-6 space-y-4" style={{ background: '#e0e5ec' } as React.CSSProperties}>

        {/* Tabs */}
        <div className="flex gap-2">
          {([['friends', 'Agent Friends'], ['ai', 'AI Conversations']] as const).map(([val, label]) => (
            <motion.button key={val} whileTap={{ scale: 0.96 }} onClick={() => setTab(val)}
              className="flex-1 h-11 rounded-xl text-[11px] font-bold uppercase tracking-wide"
              style={tab === val ? nmBtn : { ...nmInsetSm, color: '#8a9bb0' }}>
              {label}
            </motion.button>
          ))}
        </div>

        {/* ── Agent Friends tab ── */}
        {tab === 'friends' && (
          <div className="space-y-3">
            {FEATURED_WORLDTARS.map((agent, i) => (
              <motion.div key={agent.ens}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="rounded-2xl p-4 flex items-center gap-3" style={nmRaisedSm}>
                <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0" style={nmInsetSm}>
                  <img src={avatarUrl(agent.ens, i)} alt={agent.name} className="w-full h-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-coolvetica text-[0.95rem] uppercase leading-none truncate" style={{ color: '#31456a' }}>
                    {agent.name}
                  </p>
                  <p className="text-[10px] font-mono mt-0.5 truncate" style={{ color: '#8a9bb0' }}>{agent.ens}</p>
                  <p className="text-[11px] mt-1 line-clamp-1" style={{ color: '#8a9bb0' }}>{agent.bio}</p>
                </div>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => openChat(agent, i)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={nmBtn}>
                  <MessageCircle size={15} />
                </motion.button>
              </motion.div>
            ))}
          </div>
        )}

        {/* ── AI Conversations tab ── */}
        {tab === 'ai' && (
          <div className="space-y-5">

            {/* Requests */}
            {requests.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-3" style={{ color: '#8a9bb0' }}>
                  Requests
                </p>
                <div className="space-y-3">
                  {requests.map((req, i) => (
                    <motion.div key={req.id}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                      className="rounded-2xl p-4" style={nmRaisedSm}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0" style={nmInsetSm}>
                          <img src={avatarUrl(req.agentEns, req.avatarIdx)} alt={req.agentName} className="w-full h-full" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-coolvetica text-[0.9rem] uppercase leading-none truncate" style={{ color: '#31456a' }}>
                            {req.agentName}
                          </p>
                          <p className="text-[10px] font-mono mt-0.5 truncate" style={{ color: '#8a9bb0' }}>{req.agentEns}</p>
                        </div>
                        <span className="text-[9px] font-semibold shrink-0" style={{ color: '#b3b7bd' }}>{req.time}</span>
                      </div>
                      <p className="text-[12px] mb-3 leading-relaxed" style={{ color: '#8a9bb0' }}>
                        &ldquo;{req.message}&rdquo;
                      </p>
                      <div className="flex gap-2">
                        <motion.button whileTap={{ scale: 0.95 }}
                          onClick={() => setRequests(r => r.filter(x => x.id !== req.id))}
                          className="flex-1 h-10 rounded-xl flex items-center justify-center gap-1.5 text-[11px] font-bold"
                          style={{ background: '#10b981', color: '#fff', boxShadow: '3px 3px 8px rgba(16,185,129,0.35)' }}>
                          <Check size={13} /> Approve
                        </motion.button>
                        <motion.button whileTap={{ scale: 0.95 }}
                          onClick={() => setRequests(r => r.filter(x => x.id !== req.id))}
                          className="flex-1 h-10 rounded-xl flex items-center justify-center gap-1.5 text-[11px] font-bold"
                          style={{ ...nmInsetSm, color: '#8a9bb0' }}>
                          <X size={13} /> Decline
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Conversation logs */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-3" style={{ color: '#8a9bb0' }}>
                AI Conversations
              </p>
              <div className="space-y-2.5">
                {CONV_LOGS.map((log, i) => (
                  <motion.button key={log.id}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setOverlay({ type: 'readonly', log })}
                    className="w-full rounded-2xl p-4 flex items-center gap-3 text-left" style={nmRaisedSm}>
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-xl overflow-hidden" style={nmInsetSm}>
                        <img src={avatarUrl(log.agentEns, log.avatarIdx)} alt={log.agentName} className="w-full h-full" />
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ background: '#e0e5ec', boxShadow: '1px 1px 3px #b3b7bd' }}>
                        <Bot size={9} style={{ color: '#7b96f5' }} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-coolvetica text-[0.9rem] uppercase leading-none truncate" style={{ color: '#31456a' }}>
                        {log.agentName}
                      </p>
                      <p className="text-[11px] mt-1 truncate" style={{ color: '#8a9bb0' }}>{log.preview}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-[9px] font-semibold" style={{ color: '#b3b7bd' }}>{log.time}</span>
                      <ChevronRight size={13} style={{ color: '#c8d0e0' }} />
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Page.Main>

      {/* ── Overlay ── */}
      <AnimatePresence>
        {overlay && (
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="fixed inset-0 z-50 flex flex-col"
            style={{ background: '#e0e5ec' }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 pt-[max(env(safe-area-inset-top),24px)] pb-4 shrink-0"
              style={{ background: '#e0e5ec', boxShadow: '0 4px 12px rgba(179,183,189,0.4)' }}>
              <motion.button whileTap={{ scale: 0.92 }} onClick={() => setOverlay(null)}
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={nmRaisedSm}>
                <ArrowLeft size={18} style={{ color: '#8a9bb0' }} />
              </motion.button>
              <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0" style={nmInsetSm}>
                <img src={overlayAvatar} alt={overlayTitle} className="w-full h-full" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-coolvetica text-[1rem] uppercase leading-none tracking-tight truncate" style={{ color: '#31456a' }}>
                  {overlayTitle}
                </p>
                <p className="text-[10px] font-mono mt-0.5 truncate" style={{ color: '#8a9bb0' }}>{overlayEns}</p>
              </div>
              {isReadonly && (
                <div className="px-2.5 py-1 rounded-lg shrink-0" style={nmInsetSm}>
                  <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: '#8a9bb0' }}>Read only</span>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {(isReadonly ? readonlyMsgs : messages).map(msg => (
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

            {/* Input — hidden for readonly */}
            {!isReadonly && (
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
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
