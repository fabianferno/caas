'use client';

import { VerificationBadge } from '@/components/VerificationBadge';
import {
  WORLDTAR_LOOKUP,
  getDisclosureMessage,
} from '@/lib/worldtars-data';
import type { WorldtarData } from '@/lib/worldtars-data';
import { motion } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  ArrowLeft,
  Send,
  Mic,
  MicOff,
  Clock,
  Flag,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

interface Message {
  id: string;
  from: 'user' | 'agent' | 'system';
  text: string;
  time: string;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
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
  const conversationId = useRef(crypto.randomUUID());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [voiceMode, setVoiceMode] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'system-0',
      from: 'system',
      text: disclosure,
      time: '',
    },
    {
      id: 'greeting-0',
      from: 'agent',
      text: data.greeting,
      time: '0:00',
    },
  ]);
  const [sessionSeconds, setSessionSeconds] = useState(0);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Session timer
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userId = session?.user?.id || session?.user?.walletAddress || 'anonymous';

    const userMsg: Message = {
      id: crypto.randomUUID(),
      from: 'user',
      text,
      time: formatTime(sessionSeconds),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ensName,
          conversationId: conversationId.current,
          userId,
          text,
        }),
      });

      const resData = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            from: 'system',
            text: resData.error || 'Something went wrong. Please try again.',
            time: formatTime(sessionSeconds),
          },
        ]);
        return;
      }

      if (!resData.text) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            from: 'system',
            text: 'Invalid response from agent.',
            time: formatTime(sessionSeconds),
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          from: 'agent',
          text: resData.text,
          time: formatTime(sessionSeconds),
        },
      ]);
    } catch (err) {
      console.error('Chat API error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          from: 'system',
          text: 'Network error. Check your connection and try again.',
          time: formatTime(sessionSeconds),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
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
            <h2 className="font-inter font-semibold text-sm text-foreground truncate">
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

        {/* Typing indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-surface border border-surface-dark/30 rounded-2xl rounded-bl-md px-4 py-3">
              <Loader2 size={16} className="text-muted-foreground animate-spin" />
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
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
            disabled={isLoading}
            className="flex-1 bg-surface rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-accent/30 transition-all disabled:opacity-50"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={sendMessage}
            disabled={isLoading}
            className="bg-accent p-2.5 rounded-xl disabled:opacity-50"
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
