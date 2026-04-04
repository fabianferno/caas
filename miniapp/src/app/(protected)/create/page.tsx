'use client';

import { Page } from '@/components/PageLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
  ShieldCheck,
  AtSign,
  Brain,
  Rocket,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertTriangle,
  Ban,
  Info,
  MessageSquareShare,
} from 'lucide-react';

const steps = [
  { id: 1, label: 'Verify', icon: ShieldCheck },
  { id: 2, label: 'Name', icon: AtSign },
  { id: 3, label: 'Channels', icon: MessageSquareShare },
  { id: 4, label: 'Config', icon: Brain },
  { id: 5, label: 'Deploy', icon: Rocket },
];

const configQuestions = [
  "What is this agent's primary purpose?",
  'What tone should it use? (professional, friendly, concise, etc.)',
  'What domains or topics should it focus on?',
  'How should it handle questions outside its scope?',
  'What languages should it support?',
  'Should it proactively reach out or only respond?',
  'What data sources can it reference?',
  'Describe the ideal interaction with a user.',
  'What actions can it take autonomously? (payments, bookings, etc.)',
  'Any specific phrases or branding it should use?',
];

const channels = [
  { id: 'whatsapp', label: 'WhatsApp', description: 'Respond to messages on WhatsApp Business' },
  { id: 'telegram', label: 'Telegram', description: 'Operate as a Telegram bot' },
  { id: 'web', label: 'Web Chat', description: 'Embeddable chat widget for your site' },
  { id: 'api', label: 'API / x402', description: 'Expose via API with x402 micropayments' },
];

export default function Create() {
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1);

  // Form state
  const [verified, setVerified] = useState(false);
  const [ensSubname, setEnsSubname] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['web']);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [contentBoundaries, setContentBoundaries] = useState('');

  const goNext = () => {
    if (currentStep < 5) {
      setDirection(1);
      setCurrentStep((s) => s + 1);
    }
  };

  const goPrev = () => {
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep((s) => s - 1);
    }
  };

  const toggleChannel = (id: string) => {
    setSelectedChannels((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -300 : 300, opacity: 0 }),
  };

  return (
    <>
      <Page.Header className="bg-background px-5 pt-5 pb-3">
        <h1 className="font-coolvetica text-2xl text-foreground tracking-tight mb-4">
          Create a Claw
        </h1>

        {/* Step Indicator */}
        <div className="flex items-center justify-between gap-1">
          {steps.map((step, i) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    currentStep === step.id
                      ? 'bg-accent text-white'
                      : currentStep > step.id
                        ? 'bg-accent/20 text-accent'
                        : 'bg-surface text-muted-foreground'
                  }`}
                >
                  {currentStep > step.id ? (
                    <Check size={14} />
                  ) : (
                    <step.icon size={14} />
                  )}
                </div>
                <span
                  className={`text-[10px] mt-1 ${currentStep === step.id ? 'text-accent font-medium' : 'text-muted-foreground'}`}
                >
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`h-0.5 w-full mx-1 mb-4 rounded-full transition-colors ${
                    currentStep > step.id ? 'bg-accent/40' : 'bg-surface-dark'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </Page.Header>

      <Page.Main className="bg-background pb-28 px-5 pt-4 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Step 1: Verify */}
            {currentStep === 1 && (
              <div className="flex flex-col items-center text-center pt-6">
                <div className="w-20 h-20 rounded-full bg-surface flex items-center justify-center mb-5">
                  <ShieldCheck
                    size={36}
                    className={verified ? 'text-accent' : 'text-muted-foreground'}
                  />
                </div>
                <h2 className="font-coolvetica text-xl text-foreground mb-2">
                  Verify Your Humanity
                </h2>
                <p className="text-sm text-muted-foreground max-w-xs mb-4">
                  Only verified humans can create and operate Claw agents.
                  Your World ID is linked to every agent you deploy.
                </p>

                <div className="bg-accent/5 border border-accent/20 rounded-xl p-3 mb-4 max-w-xs">
                  <div className="flex items-start gap-2">
                    <Info size={14} className="text-accent mt-0.5 shrink-0" />
                    <p className="text-[11px] text-foreground/70 leading-relaxed text-left">
                      <strong>Human-operated agents:</strong> Every Claw is traceable to a
                      verified World ID. This ensures accountability and prevents bot farms.
                    </p>
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setVerified(true)}
                  className={`px-8 py-3 rounded-2xl font-bold text-sm transition-colors ${
                    verified
                      ? 'bg-accent/10 text-accent'
                      : 'bg-accent text-white'
                  }`}
                >
                  {verified ? (
                    <span className="flex items-center gap-2">
                      <Check size={16} /> Verified with World ID
                    </span>
                  ) : (
                    'Verify with World ID'
                  )}
                </motion.button>

                {verified && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 space-y-2"
                  >
                    <p className="text-xs text-accent flex items-center gap-1.5">
                      <Check size={12} /> Unique human confirmed
                    </p>
                    <p className="text-xs text-accent flex items-center gap-1.5">
                      <Check size={12} /> Ready to create agents
                    </p>
                  </motion.div>
                )}
              </div>
            )}

            {/* Step 2: Name */}
            {currentStep === 2 && (
              <div className="pt-6">
                <h2 className="font-coolvetica text-xl text-foreground mb-2">
                  Name Your Claw
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Pick a unique ENS subname for your agent. This is its
                  public identity on the network.
                </p>
                <div className="bg-card-bg rounded-2xl p-4 border border-surface-dark/50">
                  <label className="text-xs text-muted-foreground font-medium mb-2 block">
                    ENS Subname
                  </label>
                  <div className="flex items-center bg-surface rounded-xl">
                    <input
                      type="text"
                      value={ensSubname}
                      onChange={(e) =>
                        setEnsSubname(
                          e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                        )
                      }
                      placeholder="my-agent"
                      className="flex-1 bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none"
                    />
                    <span className="text-xs text-muted-foreground pr-4 shrink-0">
                      .caas.eth
                    </span>
                  </div>
                  {ensSubname && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-accent mt-2 flex items-center gap-1"
                    >
                      <Check size={12} /> {ensSubname}.caas.eth is
                      available
                    </motion.p>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Channels */}
            {currentStep === 3 && (
              <div className="pt-6">
                <h2 className="font-coolvetica text-xl text-foreground mb-2">
                  Select Channels
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Choose where your Claw will operate. You can enable more
                  channels later.
                </p>
                <div className="space-y-3">
                  {channels.map((ch) => {
                    const active = selectedChannels.includes(ch.id);
                    return (
                      <motion.button
                        key={ch.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => toggleChannel(ch.id)}
                        className={`w-full text-left rounded-xl p-4 border transition-colors ${
                          active
                            ? 'bg-accent/5 border-accent/30'
                            : 'bg-card-bg border-surface-dark/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-medium text-foreground">
                              {ch.label}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {ch.description}
                            </p>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                              active
                                ? 'bg-accent border-accent'
                                : 'border-surface-dark'
                            }`}
                          >
                            {active && <Check size={12} className="text-white" />}
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 4: Config + Guardrails */}
            {currentStep === 4 && (
              <div className="pt-2">
                <h2 className="font-coolvetica text-xl text-foreground mb-2">
                  Configure Your Agent
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Answer these questions to shape your Claw&apos;s
                  behavior, tone, and capabilities.
                </p>
                <div className="space-y-4 pb-4">
                  {configQuestions.map((q, i) => (
                    <div
                      key={i}
                      className="bg-card-bg rounded-xl p-3 border border-surface-dark/50"
                    >
                      <label className="text-xs font-medium text-foreground block mb-2">
                        {i + 1}. {q}
                      </label>
                      <textarea
                        value={answers[i] || ''}
                        onChange={(e) =>
                          setAnswers({ ...answers, [i]: e.target.value })
                        }
                        placeholder="Your answer..."
                        rows={2}
                        className="w-full bg-surface rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-accent/30 transition-all resize-none"
                      />
                    </div>
                  ))}

                  {/* Content Guardrails Section */}
                  <div className="border-t border-surface-dark/50 pt-4 mt-2">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle size={16} className="text-accent" />
                      <h3 className="font-semibold text-sm text-foreground">
                        Content Guardrails
                      </h3>
                    </div>

                    <div className="bg-surface rounded-xl p-3 mb-3">
                      <p className="text-[11px] font-medium text-foreground mb-2">
                        Default guardrails (always active):
                      </p>
                      <ul className="space-y-1.5">
                        {[
                          'No financial advice, medical claims, or legal statements',
                          'AI self-identification when asked',
                          'Mandatory disclosure at start of every session',
                          'Operator accountability via World ID',
                        ].map((rule) => (
                          <li key={rule} className="flex items-start gap-1.5">
                            <Ban size={10} className="text-muted-foreground mt-0.5 shrink-0" />
                            <span className="text-[10px] text-muted-foreground leading-tight">{rule}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-card-bg rounded-xl p-3 border border-surface-dark/50">
                      <label className="text-xs font-medium text-foreground block mb-2">
                        Custom guardrails (optional)
                      </label>
                      <textarea
                        value={contentBoundaries}
                        onChange={(e) => setContentBoundaries(e.target.value)}
                        placeholder="e.g., Never share user data externally, Don't execute transactions above 10 WLD without confirmation..."
                        rows={3}
                        className="w-full bg-surface rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-accent/30 transition-all resize-none"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        These rules are added to your Claw&apos;s system prompt.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Deploy */}
            {currentStep === 5 && (
              <div className="flex flex-col items-center text-center pt-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center mb-5">
                  <Rocket size={32} className="text-white" />
                </div>
                <h2 className="font-coolvetica text-xl text-foreground mb-2">
                  Ready to Deploy
                </h2>
                <p className="text-sm text-muted-foreground max-w-xs mb-6">
                  Your Claw will go live on the selected channels.
                  Fund it with WLD to start operating.
                </p>

                {/* Summary */}
                <div className="w-full bg-card-bg rounded-2xl p-4 border border-surface-dark/50 text-left mb-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Summary
                  </h3>
                  <div className="space-y-2.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">ENS Name</span>
                      <span className="text-foreground font-medium">
                        {ensSubname || 'my-agent'}.caas.eth
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Channels</span>
                      <span className="text-foreground font-medium">
                        {selectedChannels.length} selected
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Operator</span>
                      <span className="text-accent font-medium flex items-center gap-1">
                        <ShieldCheck size={12} /> Verified (World ID)
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Config</span>
                      <span className="text-foreground font-medium">
                        {Object.keys(answers).filter((k) => answers[Number(k)])
                          .length}
                        /10 answered
                      </span>
                    </div>
                    {contentBoundaries && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Custom Rules</span>
                        <span className="text-foreground font-medium">
                          {contentBoundaries.split(',').length} set
                        </span>
                      </div>
                    )}
                    <div className="border-t border-surface-dark/50 pt-2 mt-2 flex justify-between text-sm">
                      <span className="text-muted-foreground">Initial Credit</span>
                      <span className="text-accent font-bold">5 WLD</span>
                    </div>
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  className="w-full bg-accent text-white font-bold py-4 rounded-2xl text-[15px] active:scale-[0.98] transition-transform"
                  style={{ boxShadow: "0 4px 28px rgba(234,88,12,0.4)" }}
                >
                  Deploy My Claw — 5 WLD
                </motion.button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="fixed bottom-24 left-0 right-0 px-5 flex justify-between">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={goPrev}
            className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              currentStep === 1
                ? 'opacity-0 pointer-events-none'
                : 'bg-surface text-foreground'
            }`}
          >
            <ChevronLeft size={16} />
            Back
          </motion.button>
          {currentStep < 5 && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={goNext}
              className="flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium bg-accent text-white"
            >
              Next
              <ChevronRight size={16} />
            </motion.button>
          )}
        </div>
      </Page.Main>
    </>
  );
}
