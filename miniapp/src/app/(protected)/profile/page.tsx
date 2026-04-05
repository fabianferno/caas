'use client';

import { Page } from '@/components/PageLayout';
import { CaasLogo } from '@/components/CaasLogo';
import { motion } from 'framer-motion';
import { LogOut, ExternalLink, Copy, Check, RefreshCw, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';

const nmRaised   = { background: '#e0e5ec', boxShadow: '6px 6px 16px #b3b7bd, -6px -6px 16px rgba(255,255,255,0.5)' };
const nmRaisedSm = { background: '#e0e5ec', boxShadow: '4px 4px 12px #b3b7bd, -4px -4px 12px rgba(255,255,255,0.5)' };
const nmInset    = { background: '#e0e5ec', boxShadow: 'inset 5px 5px 14px #b3b7bd, inset -5px -5px 14px rgba(255,255,255,0.7)' };
const nmInsetSm  = { background: '#e0e5ec', boxShadow: 'inset 3px 3px 8px #b3b7bd, inset -3px -3px 8px rgba(255,255,255,0.7)' };
const nmBtn      = { background: '#7b96f5', boxShadow: '6px 6px 16px rgba(80, 100, 190, 0.55), -4px -4px 12px rgba(255,255,255,0.95)', color: '#ffffff' };

interface AgentData {
  id: string;
  agentName: string;
  agentEnsName: string;
  status: string;
  hostPort: number;
  walletAddress: string;
  createdAt: string;
  agentkitRegistered: boolean;
  soul?: string;
  avatarSeed?: string;
  avatarBg?: string;
  model?: string;
}

interface TxData {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  isError: string;
  functionName: string;
}

const shortenAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
const weiToEth = (wei: string) => (Number(wei) / 1e18).toFixed(6);
const timeAgo = (ts: string) => {
  const diff = Date.now() / 1000 - Number(ts);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const avatarUrl = (seed: string, bg: string) =>
  `https://api.dicebear.com/9.x/lorelei/svg?seed=${seed}&backgroundColor=${bg}`;

export default function Profile() {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [txs, setTxs] = useState<TxData[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/agent/list');
      if (res.ok) {
        const data = await res.json();
        setAgents(data);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const fetchTxs = async (address: string) => {
    setTxLoading(true);
    try {
      const res = await fetch(
        `https://api-sepolia.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=25&sort=desc&apikey=YourApiKeyToken`
      );
      const data = await res.json();
      if (data.status === '1' && Array.isArray(data.result)) {
        setTxs(data.result);
      }
    } catch { /* ignore */ }
    finally { setTxLoading(false); }
  };

  useEffect(() => { fetchAgents(); }, []);
  useEffect(() => {
    if (agents[0]?.walletAddress) fetchTxs(agents[0].walletAddress);
  }, [agents]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const agent = agents[0]; // Show first/latest agent

  return (
    <>
      <Page.Header className="px-5 pt-6 pb-5" style={{ background: '#e0e5ec' } as React.CSSProperties}>
        <div className="flex items-center justify-between mb-3">
          <CaasLogo />
          <div className="flex gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={fetchAgents}
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={nmRaisedSm}
            >
              <RefreshCw size={16} style={{ color: '#8a9bb0' }} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={nmRaisedSm}
            >
              <LogOut size={16} style={{ color: '#ef4444' }} />
            </motion.button>
          </div>
        </div>
        <h1
          className="font-coolvetica text-[2rem] uppercase leading-none tracking-tight"
          style={{ color: '#e0e5ec', textShadow: '-2px -2px 4px #b3b7bd, 2px 2px 5px rgba(255,255,255,0.95)' }}
        >
          Profile
        </h1>
      </Page.Header>

      <Page.Main className="pb-24 px-5 pt-5 space-y-5" style={{ background: '#e0e5ec' } as React.CSSProperties}>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw size={24} className="animate-spin" style={{ color: '#8a9bb0' }} />
          </div>
        )}

        {!loading && !agent && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-8 text-center"
            style={nmRaised}
          >
            <p className="text-[14px] font-medium" style={{ color: '#31456a' }}>No agent deployed yet</p>
            <p className="text-[12px] mt-2" style={{ color: '#8a9bb0' }}>
              Create your first Claw agent to see it here.
            </p>
          </motion.div>
        )}

        {!loading && agent && (
          <>
            {/* Agent identity card */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-5 flex items-center gap-4"
              style={nmRaised}
            >
              <div className="w-16 h-16 rounded-2xl shrink-0 overflow-hidden" style={nmInsetSm}>
                <img
                  src={avatarUrl(agent.avatarSeed || agent.agentName, agent.avatarBg || 'd1d4f9')}
                  alt="agent avatar"
                  className="w-full h-full"
                />
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className="font-coolvetica text-[1.3rem] uppercase leading-none tracking-tight truncate"
                  style={{ color: '#31456a' }}
                >
                  {agent.agentName}
                </p>
                <p className="text-[11px] font-mono mt-1 truncate" style={{ color: '#8a9bb0' }}>
                  {agent.agentEnsName}
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: agent.status === 'running' ? '#10b981' : '#ef4444',
                      boxShadow: agent.status === 'running' ? '0 0 6px #10b981' : '0 0 6px #ef4444',
                    }}
                  />
                  <span className="text-[10px] font-semibold" style={{ color: agent.status === 'running' ? '#10b981' : '#ef4444' }}>
                    {agent.status === 'running' ? 'Active' : agent.status}
                  </span>
                  {agent.agentkitRegistered && (
                    <span className="ml-2 px-2 py-0.5 rounded-md text-[9px] font-bold" style={{ background: '#dcfce7', color: '#15803d' }}>
                      World Verified
                    </span>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Wallet address card */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="rounded-2xl p-4"
              style={nmRaised}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-3" style={{ color: '#8a9bb0' }}>
                Agent Wallet
              </p>

              {/* Full address with copy */}
              <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={nmInsetSm}>
                <p className="text-[12px] font-mono flex-1 truncate" style={{ color: '#31456a' }}>
                  {agent.walletAddress}
                </p>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => copyToClipboard(agent.walletAddress, 'wallet')}
                  className="shrink-0"
                >
                  {copied === 'wallet'
                    ? <Check size={14} style={{ color: '#10b981' }} />
                    : <Copy size={14} style={{ color: '#8a9bb0' }} />
                  }
                </motion.button>
              </div>

              {/* Explorer links */}
              <div className="flex gap-2 mt-3">
                <a
                  href={`https://sepolia.etherscan.io/address/${agent.walletAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 h-10 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5"
                  style={nmRaisedSm}
                >
                  <ExternalLink size={12} style={{ color: '#7b96f5' }} />
                  <span style={{ color: '#31456a' }}>Etherscan</span>
                </a>
                <a
                  href={`https://chainscan-galileo.0g.ai/address/${agent.walletAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 h-10 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5"
                  style={nmRaisedSm}
                >
                  <ExternalLink size={12} style={{ color: '#7b96f5' }} />
                  <span style={{ color: '#31456a' }}>0G Explorer</span>
                </a>
              </div>
            </motion.div>

            {/* ENS name card */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl p-4"
              style={nmRaised}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-3" style={{ color: '#8a9bb0' }}>
                ENS Identity
              </p>

              <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={nmInsetSm}>
                <p className="text-[13px] font-mono flex-1" style={{ color: '#31456a' }}>
                  {agent.agentEnsName}
                </p>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => copyToClipboard(agent.agentEnsName, 'ens')}
                  className="shrink-0"
                >
                  {copied === 'ens'
                    ? <Check size={14} style={{ color: '#10b981' }} />
                    : <Copy size={14} style={{ color: '#8a9bb0' }} />
                  }
                </motion.button>
              </div>

              <a
                href={`https://app.ens.domains/${agent.agentEnsName}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 mt-3 h-10 rounded-xl text-[11px] font-semibold"
                style={nmRaisedSm}
              >
                <ExternalLink size={12} style={{ color: '#7b96f5' }} />
                <span style={{ color: '#31456a' }}>View on ENS</span>
              </a>
            </motion.div>

            {/* Agent details */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-2xl p-4"
              style={nmRaised}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-3" style={{ color: '#8a9bb0' }}>
                Agent Details
              </p>

              <div className="space-y-2">
                {[
                  { label: 'Model', value: agent.model || 'Default' },
                  { label: 'Created', value: new Date(agent.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={nmInsetSm}>
                    <span className="text-[11px] font-semibold" style={{ color: '#8a9bb0' }}>{row.label}</span>
                    <span className="text-[11px] font-mono" style={{ color: '#31456a' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Soul / Personality */}
            {agent.soul && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl p-4"
                style={nmRaised}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-3" style={{ color: '#8a9bb0' }}>
                  Soul / Personality
                </p>
                <div className="rounded-xl px-3 py-3" style={nmInsetSm}>
                  <p className="text-[12px] leading-relaxed" style={{ color: '#31456a' }}>
                    {agent.soul}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Transactions */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="rounded-2xl p-4"
              style={nmRaised}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: '#8a9bb0' }}>
                  Transactions
                </p>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => fetchTxs(agent.walletAddress)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={nmRaisedSm}
                >
                  <RefreshCw size={12} className={txLoading ? 'animate-spin' : ''} style={{ color: '#8a9bb0' }} />
                </motion.button>
              </div>

              {txLoading && txs.length === 0 && (
                <div className="flex items-center justify-center py-6">
                  <RefreshCw size={16} className="animate-spin" style={{ color: '#8a9bb0' }} />
                </div>
              )}

              {!txLoading && txs.length === 0 && (
                <div className="rounded-xl px-3 py-6 text-center" style={nmInsetSm}>
                  <p className="text-[12px]" style={{ color: '#8a9bb0' }}>No transactions yet</p>
                </div>
              )}

              {txs.length > 0 && (
                <div className="space-y-2">
                  {txs.map((tx, i) => {
                    const isIncoming = tx.to.toLowerCase() === agent.walletAddress.toLowerCase();
                    const ethValue = weiToEth(tx.value);
                    return (
                      <motion.a
                        key={tx.hash}
                        href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
                        target="_blank"
                        rel="noreferrer"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.28 + i * 0.03 }}
                        className="rounded-xl px-3 py-3 flex items-center gap-3 cursor-pointer"
                        style={nmRaisedSm}
                      >
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={nmInsetSm}>
                          {isIncoming
                            ? <ArrowDownLeft size={14} style={{ color: '#10b981' }} />
                            : <ArrowUpRight size={14} style={{ color: '#8a9bb0' }} />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-mono truncate" style={{ color: '#31456a' }}>
                            {isIncoming ? `From ${shortenAddress(tx.from)}` : `To ${shortenAddress(tx.to)}`}
                          </p>
                          <p className="text-[9px] mt-0.5" style={{ color: '#b3b7bd' }}>
                            {timeAgo(tx.timeStamp)} {tx.functionName ? `- ${tx.functionName.split('(')[0]}` : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span
                            className="text-[11px] font-bold tabular"
                            style={{ color: isIncoming ? '#10b981' : '#8a9bb0' }}
                          >
                            {isIncoming ? '+' : '-'}{ethValue} ETH
                          </span>
                          {tx.isError === '1' && (
                            <p className="text-[8px] font-bold mt-0.5" style={{ color: '#ef4444' }}>FAILED</p>
                          )}
                        </div>
                        <ExternalLink size={10} style={{ color: '#c8d0e0' }} className="shrink-0" />
                      </motion.a>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </>
        )}

      </Page.Main>
    </>
  );
}
