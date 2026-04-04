'use client';

import { VerificationBadge } from '@/components/VerificationBadge';
import {
  WORLDTAR_LOOKUP,
  getDisclosureMessage,
} from '@/lib/worldtars-data';
import type { WorldtarData } from '@/lib/worldtars-data';
import { motion } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import { useState } from 'react';
import {
  ArrowLeft,
  Send,
  Mic,
  MicOff,
  Clock,
  Flag,
  AlertTriangle,
} from 'lucide-react';

interface Message {
  id: number;
  from: 'user' | 'agent' | 'system';
  text: string;
  time: string;
}

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const ensName = params.ensName as string;
  const data: WorldtarData = WORLDTAR_LOOKUP[ensName] || {
    name: ensName,
    ens: `${ensName}.caas.eth`,
    price: '3 WLD/mo',
    pricePerMin: 0.1,
    bio: '',
    initials: ensName.slice(0, 2).toUpperCase(),
    gradient: 'from-accent to-accent-dark',
    category: 'new',
    rating: 0,
    verification: 'self' as const,
    greeting: `Hey! I'm the ${ensName} agent on CaaS. How can I help?`,
  };

  const disclosure = getDisclosureMessage(data);

  const [voiceMode, setVoiceMode] = useState(false);
  const [input, setInput] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      from: 'system',
      text: disclosure,
      time: '',
    },
    {
      id: 1,
      from: 'agent',
      text: data.greeting,
      time: '0:00',
    },
    {
      id: 2,
      from: 'user',
      text: "What can you help me with?",
      time: '0:05',
    },
    {
      id: 3,
      from: 'agent',
      text: "I can help with a lot! Tell me what you need — research, scheduling, transactions, or just a conversation. I'm here 24/7.",
      time: '0:12',
    },
  ]);

  const [sessionSeconds, setSessionSeconds] = useState(18);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const sendMessage = () => {
    if (!input.trim()) return;
    const newMsg: Message = {
      id: messages.length + 1,
      from: 'user',
      text: input.trim(),
      time: formatTime(sessionSeconds + 3),
    };
    setMessages([...messages, newMsg]);
    setInput('');
    setSessionSeconds((s) => s + 3);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          from: 'agent',
          text: "Great question. Let me look into that for you... I'd say the best approach depends on your specific needs. Want me to dig deeper?",
          time: formatTime(sessionSeconds + 8),
        },
      ]);
      setSessionSeconds((s) => s + 8);
    }, 1500);
  };

  const estimatedCost =
    data.pricePerMin === 0
      ? 'Free'
      : `~${((sessionSeconds / 60) * data.pricePerMin).toFixed(2)} WLD`;

  return (
    <div className="flex flex-col h-dvh bg-background">
      {/* Top Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card-bg border-b border-surface-dark/50 px-4 py-3 flex items-center gap-3 z-10"
      >
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => router.back()}
          className="p-1"
        >
          <ArrowLeft size={20} className="text-foreground" />
        </motion.button>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center">
          <span className="text-white font-semibold text-xs">
            {data.initials}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <h2 className="font-semibold text-sm text-foreground truncate">
              {data.name}
            </h2>
            <VerificationBadge status={data.verification} size="sm" />
          </div>
          <p className="text-xs text-muted-foreground">
            {ensName}.caas.eth · {data.price}
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setVoiceMode(!voiceMode)}
          className={`p-2 rounded-full transition-colors ${voiceMode ? 'bg-accent text-white' : 'bg-surface text-muted-foreground'}`}
        >
          {voiceMode ? <Mic size={16} /> : <MicOff size={16} />}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowReportModal(true)}
          className="p-2 rounded-full bg-surface text-muted-foreground"
          title="Report this agent"
        >
          <Flag size={14} />
        </motion.button>
      </motion.div>

      {/* Session Timer */}
      <div className="bg-surface/70 px-4 py-1.5 flex items-center justify-center gap-3 text-xs">
        <span className="flex items-center gap-1 text-muted-foreground">
          <Clock size={12} />
          {formatTime(sessionSeconds)}
        </span>
        <span className="text-surface-dark">|</span>
        <span className="text-accent font-medium">{estimatedCost}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`flex ${msg.from === 'user' ? 'justify-end' : msg.from === 'system' ? 'justify-center' : 'justify-start'}`}
          >
            {msg.from === 'system' ? (
              <div className="max-w-[90%] bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-2.5 flex items-start gap-2">
                <AlertTriangle size={14} className="text-accent mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">{msg.text}</p>
              </div>
            ) : (
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  msg.from === 'user'
                    ? 'bg-accent text-white rounded-br-md'
                    : 'bg-surface border border-surface-dark/30 text-foreground rounded-bl-md'
                }`}
              >
                <p className="text-sm leading-relaxed">{msg.text}</p>
                <p
                  className={`text-[10px] mt-1 ${msg.from === 'user' ? 'text-white/60' : 'text-muted-foreground'}`}
                >
                  {msg.time}
                </p>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Input Bar */}
      <div className="bg-card-bg border-t border-surface-dark/50 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 bg-surface rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-accent/30 transition-all"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={sendMessage}
            className="bg-accent p-2.5 rounded-xl"
          >
            <Send size={18} className="text-white" />
          </motion.button>
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
          onClick={() => setShowReportModal(false)}
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
              Report this Agent
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Select a reason for reporting {data.name}.
            </p>
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
                  onClick={() => {
                    setShowReportModal(false);
                  }}
                  className="w-full text-left bg-surface rounded-xl px-4 py-3 text-sm text-foreground hover:bg-surface-dark transition-colors"
                >
                  {reason}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowReportModal(false)}
              className="w-full mt-3 text-center py-3 text-sm text-muted-foreground"
            >
              Cancel
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
