'use client';

import { Page } from '@/components/PageLayout';
import { CaasLogo } from '@/components/CaasLogo';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
  Check,
  Send,
  MessageCircle,
  Hash,
  FileText,
  Database,
  Rocket,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';

/* ── Shadow constants ── */
const nmRaised   = { background: '#e0e5ec', boxShadow: '8px 8px 20px #b3b7bd, -8px -8px 20px rgba(255,255,255,0.5)' };
const nmRaisedSm = { background: '#e0e5ec', boxShadow: '5px 5px 14px #b3b7bd, -5px -5px 14px rgba(255,255,255,0.5)' };
const nmInset    = { background: '#e0e5ec', boxShadow: 'inset 5px 5px 14px #b3b7bd, inset -5px -5px 14px rgba(255,255,255,0.7)' };
const nmInsetSm  = { background: '#e0e5ec', boxShadow: 'inset 3px 3px 8px #b3b7bd, inset -3px -3px 8px rgba(255,255,255,0.7)' };
const nmBtn      = { background: '#7b96f5', boxShadow: '6px 6px 16px rgba(80, 100, 190, 0.55), -4px -4px 12px rgba(255,255,255,0.95)', color: '#ffffff' };

/* ── Data ── */
const STEPS = ['Identity', 'Model', 'Soul', 'Channels', 'Memory', 'Deploy'];

const AVATAR_BGS = ['b6e3f4', 'd1d4f9', 'ffd5dc', 'c0aede', 'ffdfbf', 'b6f4e3', 'f4d1b6', 'd4f4b6'];
const makeAvatars = () => AVATAR_BGS.map((bg, i) => ({
  id: `av${i}`,
  seed: Math.random().toString(36).slice(2, 10),
  bg,
}));

// Generated once per browser session — stable across remounts and HMR
const SESSION_AVATARS = makeAvatars();

const avatarUrl = (seed: string, bg: string) =>
  `https://api.dicebear.com/9.x/lorelei/svg?seed=${seed}&backgroundColor=${bg}`;

const MODELS = [
  { id: 'qwen',   name: 'Qwen 2.5 7B',   provider: 'Alibaba',   desc: 'Fast, open-source. Great for instruction following.', dot: '#f97316', available: true  },
  { id: 'claude', name: 'Claude Sonnet',  provider: 'Anthropic', desc: 'Best at reasoning and nuanced writing.',              dot: '#c17a3a', available: false },
  { id: 'gpt4o',  name: 'GPT-4o',         provider: 'OpenAI',    desc: 'Industry standard. Multimodal ready.',                dot: '#74aa9c', available: false },
  { id: 'gemini', name: 'Gemini Pro',     provider: 'Google',    desc: 'Fast and great for search-heavy tasks.',              dot: '#7b96f5', available: false },
];

const SOULS = [
  { id: 'professional', name: 'Professional', desc: 'Formal, precise, reliable.',      emoji: '💼' },
  { id: 'friendly',     name: 'Friendly',      desc: 'Warm and conversational.',         emoji: '😊' },
  { id: 'creative',     name: 'Creative',       desc: 'Imaginative, unconventional.',     emoji: '🎨' },
  { id: 'analytical',   name: 'Analytical',    desc: 'Data-driven, methodical.',         emoji: '📊' },
  { id: 'supportive',   name: 'Supportive',    desc: 'Empathetic, encouraging.',         emoji: '🤝' },
  { id: 'custom',       name: 'Custom',         desc: 'Write your own personality.',      emoji: '✨' },
];

const CHANNELS = [
  { id: 'telegram', name: 'Telegram', desc: 'Deploy as a Telegram bot',        icon: Send,          placeholder: 'Bot token from @BotFather' },
  { id: 'discord',  name: 'Discord',  desc: 'Deploy as a Discord bot',         icon: Hash,          placeholder: 'Discord bot token' },
  { id: 'whatsapp', name: 'WhatsApp', desc: 'Via WhatsApp Business API',        icon: MessageCircle, placeholder: 'WhatsApp Business API key' },
];

const MEMORY = [
  { id: 'encrypted-md', name: 'Encrypted MD File',  desc: 'Memory stored as an encrypted markdown file. Private and portable.', icon: FileText },
  { id: '0g-store',     name: '0G Private Store',    desc: 'Decentralized encrypted storage on 0G. Persistent, censorship-resistant.', icon: Database },
];

export default function Create() {
  const [step, setStep] = useState(1);
  const [dir,  setDir]  = useState(1);

  const [avatars,     setAvatars]     = useState(SESSION_AVATARS);
  const [agentName,   setAgentName]   = useState('');
  const [avatar,      setAvatar]      = useState('av0');
  const [avatarDir,   setAvatarDir]   = useState(0);
  const [model,       setModel]       = useState('qwen');
  const [soul,        setSoul]        = useState('friendly');
  const [customSoul,  setCustomSoul]  = useState('');
  const [channels,    setChannels]    = useState<Record<string, boolean>>({});
  const [tokens,      setTokens]      = useState<Record<string, string>>({});
  const [showToken,   setShowToken]   = useState<Record<string, boolean>>({});
  const [memory,      setMemory]      = useState('encrypted-md');

  const goNext = () => { if (step < 6) { setDir(1);  setStep(s => s + 1); } };
  const goPrev = () => { if (step > 1) { setDir(-1); setStep(s => s - 1); } };

  const avatarIdx     = avatars.findIndex(a => a.id === avatar);
  const prevAvatarIdx = (avatarIdx - 1 + avatars.length) % avatars.length;
  const nextAvatarIdx = (avatarIdx + 1) % avatars.length;
  const goAvatarPrev  = () => { setAvatarDir(-1); setAvatar(avatars[prevAvatarIdx].id); };
  const goAvatarNext  = () => { setAvatarDir(1);  setAvatar(avatars[nextAvatarIdx].id); };
  const regenerateAvatars = () => { setAvatars(makeAvatars()); setAvatar('av0'); setAvatarDir(0); };

  const toggleChannel = (id: string) =>
    setChannels(prev => ({ ...prev, [id]: !prev[id] }));

  const selectedAvatar   = avatars.find(a => a.id === avatar);
  const selectedModel    = MODELS.find(m => m.id === model);
  const selectedSoul     = SOULS.find(s => s.id === soul);
  const activeChannels   = CHANNELS.filter(c => channels[c.id]);

  const slideVariants = {
    enter:  (d: number) => ({ x: d > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:   (d: number) => ({ x: d > 0 ? -300 : 300, opacity: 0 }),
  };

  return (
    <>
      {/* ── Header ── */}
      <Page.Header className="px-5 pt-6 pb-4 shrink-0" style={{ background: '#e0e5ec' } as React.CSSProperties}>

        {/* Brand row */}
        <div className="flex items-center justify-between mb-4">
          <CaasLogo />
          <div
            className="px-3 py-1.5 rounded-xl"
            style={{ background: '#e0e5ec', boxShadow: 'inset 3px 3px 8px #b3b7bd, inset -3px -3px 8px rgba(255,255,255,0.7)' }}
          >
            <span className="text-[11px] font-bold tabular" style={{ color: '#8a9bb0' }}>
              {step} <span style={{ color: '#c8d0e0' }}>/</span> {STEPS.length}
            </span>
          </div>
        </div>

        {/* Step dots — full width with connector lines */}
        <div className="flex items-center gap-0 mb-4">
          {STEPS.map((_, i) => {
            const n = i + 1;
            const active = step === n;
            const done   = step > n;
            return (
              <div key={n} className="flex items-center flex-1">
                <button
                  onClick={() => { if (done) { setDir(-1); setStep(n); } }}
                  className="flex items-center justify-center rounded-full transition-all shrink-0"
                  style={{
                    width: active ? 28 : 20, height: active ? 28 : 20,
                    ...(active ? { background: '#7b96f5', boxShadow: '3px 3px 8px rgba(123,150,245,0.5), -1px -1px 4px rgba(255,255,255,0.9)' }
                      : done   ? nmInsetSm
                      :          nmRaisedSm),
                  }}
                >
                  {done   && <Check size={9} style={{ color: '#7b96f5' }} />}
                  {active && <span className="text-[10px] font-bold text-white">{n}</span>}
                </button>
                {i < STEPS.length - 1 && (
                  <div className="h-px flex-1 mx-1.5 rounded-full"
                    style={{ background: done ? '#7b96f5' : '#c8d0e0' }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step title */}
        <div className="flex flex-col items-center text-center">
          <h1
            className="font-coolvetica text-[2rem] uppercase leading-none tracking-tight"
            style={{ color: '#e0e5ec', textShadow: '-2px -2px 4px #b3b7bd, 2px 2px 5px rgba(255,255,255,0.95)' }}
          >
            {STEPS[step - 1]}
          </h1>
        </div>
      </Page.Header>

      {/* ── Main ── */}
      <Page.Main
        className="pb-24 px-5 pt-4 overflow-y-auto overflow-x-hidden"
        style={{ background: '#e0e5ec' } as React.CSSProperties}
      >
        {/* Slide content */}
        <div className="overflow-x-hidden">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            >

              {/* ───── Step 1: Identity ───── */}
              {step === 1 && (
                <div className="space-y-6">

                  {/* Avatar spotlight */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-4" style={{ color: '#8a9bb0' }}>
                      Avatar
                    </p>

                    {/* Spotlight row */}
                    <div className="flex items-center justify-center gap-4">

                      {/* Prev */}
                      <motion.button
                        whileTap={{ scale: 0.88 }}
                        onClick={goAvatarPrev}
                        aria-label="Previous avatar"
                        className="w-[76px] h-[76px] rounded-2xl overflow-hidden shrink-0"
                        style={{
                          boxShadow: '4px 4px 12px #b3b7bd, -4px -4px 12px rgba(255,255,255,0.5)',
                          filter: 'blur(2px)',
                          opacity: 0.38,
                        }}
                      >
                        <img src={avatarUrl(avatars[prevAvatarIdx].seed, avatars[prevAvatarIdx].bg)} alt="" className="w-full h-full" />
                      </motion.button>

                      {/* Center — single img load */}
                      <div
                        className="relative w-[148px] h-[148px] shrink-0 rounded-3xl overflow-hidden"
                        style={{ boxShadow: '8px 8px 20px #b3b7bd, -8px -8px 20px rgba(255,255,255,0.5)' }}
                      >
                        <AnimatePresence mode="sync" custom={avatarDir} initial={false}>
                          <motion.div
                            key={avatar}
                            custom={avatarDir}
                            variants={{
                              enter:  (d: number) => ({ x: d === 0 ? 0 : d > 0 ? 148 : -148, opacity: d === 0 ? 0 : 1 }),
                              center: { x: 0, opacity: 1 },
                              exit:   (d: number) => ({ x: d === 0 ? 0 : d > 0 ? -148 : 148, opacity: d === 0 ? 0 : 1 }),
                            }}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ type: 'spring', stiffness: 420, damping: 38, mass: 0.8 }}
                            className="absolute inset-0"
                          >
                            <img
                              src={avatarUrl(selectedAvatar!.seed, selectedAvatar!.bg)}
                              alt="selected avatar"
                              className="w-full h-full"
                            />
                          </motion.div>
                        </AnimatePresence>
                      </div>

                      {/* Next */}
                      <motion.button
                        whileTap={{ scale: 0.88 }}
                        onClick={goAvatarNext}
                        aria-label="Next avatar"
                        className="w-[76px] h-[76px] rounded-2xl overflow-hidden shrink-0"
                        style={{
                          boxShadow: '4px 4px 12px #b3b7bd, -4px -4px 12px rgba(255,255,255,0.5)',
                          filter: 'blur(2px)',
                          opacity: 0.38,
                        }}
                      >
                        <img src={avatarUrl(avatars[nextAvatarIdx].seed, avatars[nextAvatarIdx].bg)} alt="" className="w-full h-full" />
                      </motion.button>
                    </div>

                    {/* Dots + regenerate */}
                    <div className="flex items-center justify-center gap-3 mt-4">
                      <div className="flex items-center gap-1.5">
                        {avatars.map((a, i) => (
                          <button
                            key={a.id}
                            aria-label={`Select avatar ${i + 1}`}
                            onClick={() => { setAvatarDir(i > avatarIdx ? 1 : -1); setAvatar(a.id); }}
                            style={{
                              width: avatar === a.id ? 18 : 6,
                              height: 6,
                              borderRadius: 3,
                              background: avatar === a.id ? '#7b96f5' : '#c8d0e0',
                              border: 'none',
                              padding: 0,
                              transition: 'all 220ms ease',
                              cursor: 'pointer',
                            }}
                          />
                        ))}
                      </div>

                      <motion.button
                        whileTap={{ scale: 0.88 }}
                        onClick={regenerateAvatars}
                        aria-label="Regenerate avatars"
                        className="w-7 h-7 rounded-full flex items-center justify-center"
                        style={nmRaisedSm}
                      >
                        <RefreshCw size={12} style={{ color: '#8a9bb0' }} />
                      </motion.button>
                    </div>
                  </div>

                  {/* Name input */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-2" style={{ color: '#8a9bb0' }}>
                      Agent Name
                    </p>
                    <div className="rounded-2xl overflow-hidden" style={nmInset}>
                      <div className="flex items-center px-5 py-2">
                        <span className="text-[17px] font-medium pr-1.5 shrink-0 select-none" style={{ color: '#b3b7bd' }}>@</span>
                        <input
                          type="text"
                          value={agentName}
                          onChange={e => setAgentName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                          placeholder="my-agent"
                          className="flex-1 bg-transparent py-5 text-[18px] font-medium outline-none placeholder:text-[#c0cad8]"
                          style={{ color: '#31456a' }}
                        />
                        <span className="text-[13px] font-semibold shrink-0 select-none" style={{ color: '#b3b7bd' }}>.caas.eth</span>
                      </div>
                    </div>
                    <AnimatePresence>
                      {agentName && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="text-[11px] mt-2 flex items-center gap-1.5 pl-1"
                          style={{ color: '#7b96f5' }}
                        >
                          <Check size={11} /> {agentName}.caas.eth is available
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Preview — only when name is set */}
                  <AnimatePresence>
                    {agentName && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                        className="rounded-2xl p-4 flex items-center gap-3"
                        style={{ background: '#e0e5ec', boxShadow: '8px 8px 20px #b3b7bd, -8px -8px 20px rgba(255,255,255,0.5)' }}
                      >
                        {/* Inset well around avatar image */}
                        <div
                          className="w-14 h-14 rounded-xl shrink-0 p-[3px]"
                          style={nmInsetSm}
                        >
                          <div className="w-full h-full rounded-lg overflow-hidden">
                            <img src={avatarUrl(selectedAvatar!.seed, selectedAvatar!.bg)} alt="avatar" className="w-full h-full" />
                          </div>
                        </div>
                        <div>
                          <p className="font-coolvetica text-[1.1rem] uppercase leading-none" style={{ color: '#31456a' }}>
                            {agentName}
                          </p>
                          <p className="text-[11px] mt-0.5" style={{ color: '#8a9bb0' }}>{agentName}.caas.eth</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* ───── Step 2: Model ───── */}
              {step === 2 && (
                <div className="grid grid-cols-2 gap-5">
                  {MODELS.map(m => (
                    <motion.button
                      key={m.id}
                      whileTap={m.available ? { scale: 0.97 } : {}}
                      onClick={() => m.available && setModel(m.id)}
                      className="rounded-2xl p-4 flex flex-col text-left relative"
                      style={{
                        ...(m.available && model === m.id ? nmInsetSm : nmRaisedSm),
                        minHeight: 130,
                        opacity: m.available ? 1 : 0.45,
                        cursor: m.available ? 'pointer' : 'default',
                      }}
                    >
                      {/* Selected check */}
                      {m.available && model === m.id && (
                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: '#7b96f5', boxShadow: '2px 2px 4px rgba(123,150,245,0.4)' }}>
                          <Check size={9} color="#fff" />
                        </div>
                      )}
                      {/* Coming soon badge */}
                      {!m.available && (
                        <div className="absolute top-3 right-3 px-1.5 py-0.5 rounded-full"
                          style={{ background: '#e0e5ec', boxShadow: 'inset 2px 2px 4px #b3b7bd, inset -2px -2px 4px rgba(255,255,255,0.85)' }}>
                          <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: '#8a9bb0' }}>Soon</span>
                        </div>
                      )}
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={nmInsetSm}>
                        <span className="w-3 h-3 rounded-full block" style={{ background: m.dot, boxShadow: `0 0 8px ${m.dot}` }} />
                      </div>
                      <p className="font-coolvetica text-[0.95rem] uppercase leading-none" style={{ color: '#31456a' }}>
                        {m.name}
                      </p>
                      <p className="text-[10px] mt-1 font-bold uppercase tracking-wider" style={{ color: m.dot }}>
                        {m.provider}
                      </p>
                      <p className="text-[10px] mt-2 leading-snug" style={{ color: '#8a9bb0' }}>{m.desc}</p>
                    </motion.button>
                  ))}
                </div>
              )}

              {/* ───── Step 3: Soul ───── */}
              {step === 3 && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-5">
                    {SOULS.map(s => (
                      <motion.button
                        key={s.id}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setSoul(s.id)}
                        className="rounded-2xl p-4 flex flex-col text-left relative"
                        style={soul === s.id ? { ...nmInsetSm, minHeight: 100 } : { ...nmRaisedSm, minHeight: 100 }}
                      >
                        {soul === s.id && (
                          <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ background: '#7b96f5', boxShadow: '2px 2px 4px rgba(123,150,245,0.4)' }}>
                            <Check size={9} color="#fff" />
                          </div>
                        )}
                        <span className="text-xl mb-2">{s.emoji}</span>
                        <p className="font-coolvetica text-[0.9rem] uppercase leading-none mb-1" style={{ color: '#31456a' }}>
                          {s.name}
                        </p>
                        <p className="text-[10px] leading-snug" style={{ color: '#8a9bb0' }}>{s.desc}</p>
                      </motion.button>
                    ))}
                  </div>

                  <AnimatePresence>
                    {soul === 'custom' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <textarea
                          value={customSoul}
                          onChange={e => setCustomSoul(e.target.value)}
                          placeholder="Describe your agent's personality, tone, and behavior in detail..."
                          rows={4}
                          className="w-full px-4 py-3.5 text-[13px] outline-none resize-none rounded-2xl placeholder:text-[#c0cad8]"
                          style={{ ...nmInset, color: '#31456a' }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* ───── Step 4: Channels ───── */}
              {step === 4 && (
                <div className="space-y-5">
                  {CHANNELS.map(ch => {
                    const active = !!channels[ch.id];
                    return (
                      <div key={ch.id} className="rounded-2xl overflow-hidden" style={nmRaisedSm}>
                        <div className="flex items-center gap-3 p-4">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={nmInsetSm}>
                            <ch.icon size={17} style={{ color: active ? '#7b96f5' : '#b3b7bd' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-coolvetica text-[0.95rem] uppercase leading-none" style={{ color: '#31456a' }}>
                              {ch.name}
                            </p>
                            <p className="text-[11px] mt-0.5" style={{ color: '#8a9bb0' }}>{ch.desc}</p>
                          </div>
                          {/* Toggle */}
                          <motion.button
                            whileTap={{ scale: 0.88 }}
                            onClick={() => toggleChannel(ch.id)}
                            className="w-12 h-6 rounded-full relative shrink-0"
                            style={active
                              ? { background: '#7b96f5', boxShadow: 'inset 2px 2px 4px rgba(60,80,180,0.3)' }
                              : nmInsetSm
                            }
                          >
                            <motion.div
                              animate={{ x: active ? 24 : 2 }}
                              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                              className="absolute top-[3px] w-[18px] h-[18px] rounded-full"
                              style={active
                                ? { background: '#fff', boxShadow: '1px 1px 3px rgba(0,0,0,0.15)' }
                                : { background: '#e0e5ec', boxShadow: '2px 2px 4px #b3b7bd, -1px -1px 3px #fff' }
                              }
                            />
                          </motion.button>
                        </div>

                        <AnimatePresence>
                          {active && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4">
                                <div className="flex items-center rounded-xl overflow-hidden" style={nmInset}>
                                  <input
                                    type={showToken[ch.id] ? 'text' : 'password'}
                                    value={tokens[ch.id] || ''}
                                    onChange={e => setTokens(prev => ({ ...prev, [ch.id]: e.target.value }))}
                                    placeholder={ch.placeholder}
                                    className="flex-1 bg-transparent px-4 py-3.5 text-[13px] outline-none placeholder:text-[#c0cad8]"
                                    style={{ color: '#31456a' }}
                                  />
                                  <button className="px-4 py-3.5" onClick={() => setShowToken(p => ({ ...p, [ch.id]: !p[ch.id] }))}>
                                    {showToken[ch.id]
                                      ? <EyeOff size={14} style={{ color: '#b3b7bd' }} />
                                      : <Eye size={14} style={{ color: '#b3b7bd' }} />
                                    }
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                  {activeChannels.length === 0 && (
                    <p className="text-[12px] text-center pt-1" style={{ color: '#c0cad8' }}>
                      Enable at least one channel.
                    </p>
                  )}
                </div>
              )}

              {/* ───── Step 5: Memory ───── */}
              {step === 5 && (
                <div className="space-y-5">
                  {MEMORY.map(m => (
                    <motion.button
                      key={m.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setMemory(m.id)}
                      className="w-full text-left rounded-2xl p-4"
                      style={memory === m.id ? nmInsetSm : nmRaisedSm}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={nmInsetSm}>
                          <m.icon size={18} style={{ color: memory === m.id ? '#7b96f5' : '#b3b7bd' }} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-coolvetica text-[1rem] uppercase leading-none" style={{ color: '#31456a' }}>
                              {m.name}
                            </p>
                            {memory === m.id && (
                              <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                                style={{ background: '#7b96f5', boxShadow: '2px 2px 4px rgba(123,150,245,0.4)' }}>
                                <Check size={10} color="#fff" />
                              </div>
                            )}
                          </div>
                          <p className="text-[12px] mt-1.5 leading-relaxed" style={{ color: '#8a9bb0' }}>{m.desc}</p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}

              {/* ───── Step 6: Deploy ───── */}
              {step === 6 && (
                <div className="flex flex-col gap-5">

                  {/* Hero identity card */}
                  <div className="rounded-3xl p-6 flex flex-col items-center text-center" style={nmRaised}>
                    <div className="w-24 h-24 rounded-2xl overflow-hidden mb-3" style={nmInsetSm}>
                      <img src={avatarUrl(selectedAvatar!.seed, selectedAvatar!.bg)} alt="avatar" className="w-full h-full" />
                    </div>
                    <p className="font-coolvetica text-[1.5rem] uppercase leading-none tracking-tight" style={{ color: '#31456a' }}>
                      {agentName || 'my-agent'}
                    </p>
                    <p className="text-[12px] mt-1 font-mono" style={{ color: '#8a9bb0' }}>
                      {agentName || 'my-agent'}.caas.eth
                    </p>

                    {/* Inline spec pills */}
                    <div className="flex items-stretch gap-2 mt-4 w-full">
                      {[
                        { label: 'Model',  val: selectedModel?.name ?? '',  dot: selectedModel?.dot },
                        { label: 'Soul',   val: `${selectedSoul?.emoji} ${selectedSoul?.name}` },
                        { label: 'Memory', val: memory === 'encrypted-md' ? 'Encrypted MD' : '0G Store' },
                      ].map(pill => (
                        <div key={pill.label} className="flex-1 flex flex-col items-center py-2.5 px-2 rounded-xl" style={nmInsetSm}>
                          <p className="text-[8px] font-bold uppercase tracking-[0.14em] mb-1" style={{ color: '#b3b7bd' }}>
                            {pill.label}
                          </p>
                          <div className="flex items-center gap-1">
                            {pill.dot && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: pill.dot }} />}
                            <p className="text-[10px] font-semibold leading-tight text-center" style={{ color: '#31456a' }}>
                              {pill.val}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Channels */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-2.5" style={{ color: '#8a9bb0' }}>
                      Channels
                    </p>
                    {activeChannels.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {activeChannels.map(ch => (
                          <div key={ch.id} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl" style={nmRaisedSm}>
                            <ch.icon size={13} style={{ color: '#7b96f5' }} />
                            <span className="text-[12px] font-semibold" style={{ color: '#31456a' }}>{ch.name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-3 rounded-2xl" style={nmInsetSm}>
                        <p className="text-[12px]" style={{ color: '#c0cad8' }}>No channels configured — agent accessible via API only.</p>
                      </div>
                    )}
                  </div>

                  {/* Deploy CTA */}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    className="w-full h-14 rounded-2xl font-bold text-[16px] flex items-center justify-center gap-2.5"
                    style={nmBtn}
                  >
                    <Rocket size={18} />
                    Deploy Agent
                  </motion.button>

                  <p className="text-center text-[11px] -mt-2" style={{ color: '#c0cad8' }}>
                    Your Claw will be live within seconds.
                  </p>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Back / Continue ── */}
        {step < 6 && (
          <div className="flex justify-between items-center gap-3 mt-7">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={goPrev}
              className="flex items-center justify-center gap-2 px-6 h-10 rounded-2xl text-[15px] font-semibold"
              style={step === 1
                ? { opacity: 0, pointerEvents: 'none' as const, ...nmRaisedSm, color: '#8a9bb0' }
                : { ...nmRaisedSm, color: '#8a9bb0' }
              }
            >
              Back
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={goNext}
              className="flex items-center justify-center gap-2 w-[180px] h-10 rounded-2xl text-[16px] font-bold"
              style={nmBtn}
            >
              Continue
            </motion.button>
          </div>
        )}

      </Page.Main>
    </>
  );
}
