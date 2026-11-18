import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Check, Leaf, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import landDollarBaseImg from '@/assets/land-dolar-base1.webp';
import forestRefImg from '@/assets/vegetacion-ref-arbol.webp';
import logoReforestal from '@/assets/icons/logo-dorado.png';

const PHASES = ['scan', 'morph', 'ready'];

const STEPS = [
  { id: 'scan', number: '01', label: 'Escanear' },
  { id: 'morph', number: '02', label: 'Germinar' },
  { id: 'ready', number: '03', label: 'Reclamar' },
];

const PHASE_CONTENT = {
  scan: {
    eyebrow: 'Golden Hour · Land Dollar',
    title: 'Un billete. Un metro cuadrado. Un nuevo comienzo.',
    body: 'Estamos leyendo tu código y preparando tu semilla digital.',
    hint: 'Mantén la calma: la magia tarda unos segundos.',
  },
  morph: {
    eyebrow: 'Germinando tu semilla',
    title: 'Tu Land Dollar se convierte en bosque.',
    body: 'Cada Land Dollar protege 1 dm² de selva amazónica y activa tu lugar en Myzel 3.0.',
    hint: '100 puntos inmaduros SELF_REBATE se suman a tu cuenta.',
  },
  ready: {
    eyebrow: 'Tu semilla está lista',
    title: 'Reclama tu lugar en el bosque.',
    body: 'Registra tu nickname para guardar tu Land Dollar, recibir tus 100 puntos y comenzar tu primera misión.',
    hint: 'Sin tarjeta. Sin barreras. Solo tu nombre y tu intención.',
  },
};

const GoldenHour = () => {
  const { slug } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [phase, setPhase] = useState('scan');

  const refCode = useMemo(() => {
    if (!slug) return '';
    try {
      return decodeURIComponent(slug).trim().toLowerCase();
    } catch {
      return slug.trim().toLowerCase();
    }
  }, [slug]);

  const prefersReducedMotion = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (authLoading || !refCode) return;
    if (!user) {
      localStorage.setItem('reforestal_ref', refCode);
    }
  }, [authLoading, refCode, user]);

  useEffect(() => {
    if (phase === 'scan') {
      const timer = window.setTimeout(() => setPhase('morph'), prefersReducedMotion ? 700 : 2600);
      return () => window.clearTimeout(timer);
    }
    if (phase === 'morph') {
      const timer = window.setTimeout(() => setPhase('ready'), prefersReducedMotion ? 700 : 3000);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [phase, prefersReducedMotion]);

  const phaseIndex = PHASES.indexOf(phase);
  const content = PHASE_CONTENT[phase];
  const reveal = phase === 'scan'
    ? 'circle(0% at 50% 50%)'
    : phase === 'morph'
      ? 'circle(68% at 50% 50%)'
      : 'circle(150% at 50% 50%)';
  const revealTransition = prefersReducedMotion
    ? { duration: 0.15 }
    : { duration: 1.6, ease: [0.22, 1, 0.36, 1] };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#02140f] text-white selection:bg-gold selection:text-[#02140f]">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-40 top-[-10rem] h-[32rem] w-[32rem] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -right-32 bottom-[-12rem] h-[36rem] w-[36rem] rounded-full bg-gold/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.055]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8 sm:py-8">
        <header className="flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <img src={logoReforestal} alt="Reforestal" className="h-10 w-auto object-contain sm:h-12" />
            <span className="hidden text-[10px] font-semibold uppercase tracking-[0.3em] text-white/45 sm:block">
              Myzel 3.0
            </span>
          </Link>
          <div className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-gold backdrop-blur">
            Golden Hour
          </div>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center py-8 sm:py-10">
          <div className="w-full max-w-4xl">
            <div className="text-center" aria-live="polite">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 backdrop-blur">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-gold sm:text-xs">
                  {content.eyebrow}
                </span>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={phase}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: prefersReducedMotion ? 0.1 : 0.35 }}
                >
                  <h1 className="mx-auto mt-5 max-w-3xl text-3xl font-black leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
                    {content.title}
                  </h1>
                  <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base">
                    {content.body}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="relative mx-auto mt-8 w-full">
              <div className="absolute -inset-4 rounded-[2.5rem] bg-gold/10 blur-2xl" aria-hidden="true" />
              <div className="relative overflow-hidden rounded-[1.5rem] border border-gold/25 bg-[#071b14] shadow-[0_30px_100px_rgba(0,0,0,0.55)] sm:rounded-[2rem]">
                <div className="relative aspect-[2.1/1] sm:aspect-[2.4/1]">
                  <motion.img
                    src={landDollarBaseImg}
                    alt="Land Dollar impreso de Reforestal"
                    className="absolute inset-0 h-full w-full object-cover"
                    animate={phase === 'scan'
                      ? { opacity: 1, scale: 1, filter: 'saturate(1) brightness(1)' }
                      : { opacity: phase === 'ready' ? 0 : 0.32, scale: 1.07, filter: 'saturate(0.55) brightness(0.55)' }}
                    transition={{ duration: prefersReducedMotion ? 0.2 : 1.2, ease: 'easeInOut' }}
                  />

                  <motion.div
                    className="absolute inset-0"
                    initial={false}
                    animate={{ clipPath: reveal }}
                    transition={revealTransition}
                  >
                    <img
                      src={forestRefImg}
                      alt="Bosque amazónico"
                      className="h-full w-full scale-105 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#02140f]/85 via-[#02140f]/10 to-[#02140f]/30" />
                  </motion.div>

                  <div className="pointer-events-none absolute inset-3 z-20 sm:inset-4">
                    <span className="absolute left-0 top-0 h-7 w-7 rounded-tl-lg border-l-2 border-t-2 border-gold/70 sm:h-9 sm:w-9" />
                    <span className="absolute right-0 top-0 h-7 w-7 rounded-tr-lg border-r-2 border-t-2 border-gold/70 sm:h-9 sm:w-9" />
                    <span className="absolute bottom-0 left-0 h-7 w-7 rounded-bl-lg border-b-2 border-l-2 border-gold/70 sm:h-9 sm:w-9" />
                    <span className="absolute bottom-0 right-0 h-7 w-7 rounded-br-lg border-b-2 border-r-2 border-gold/70 sm:h-9 sm:w-9" />
                  </div>

                  <div className="absolute left-4 top-4 z-30 rounded-full border border-white/20 bg-black/35 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-white/75 backdrop-blur sm:left-5 sm:top-5 sm:text-[10px]">
                    Land Dollar
                  </div>
                  <div className="absolute right-4 top-4 z-30 rounded-full border border-gold/35 bg-[#02140f]/55 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-gold backdrop-blur sm:right-5 sm:top-5 sm:text-[10px]">
                    1 dm²
                  </div>

                  {phase === 'scan' && (
                    <motion.div
                      aria-hidden="true"
                      className="absolute inset-x-0 z-30 h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent shadow-[0_0_28px_rgba(197,155,39,0.95)]"
                      initial={{ top: '12%', opacity: 0 }}
                      animate={{ top: ['12%', '88%', '12%'], opacity: [0, 1, 1, 0] }}
                      transition={{ duration: prefersReducedMotion ? 0.8 : 3, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}

                  <AnimatePresence>
                    {phase === 'morph' && (
                      <motion.div
                        key="seed-badge"
                        className="absolute inset-0 z-30 flex items-center justify-center"
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: prefersReducedMotion ? 0.1 : 0.45 }}
                      >
                        <div className="flex flex-col items-center rounded-full border border-gold/40 bg-[#02140f]/75 px-6 py-4 text-center shadow-glow backdrop-blur-md sm:px-8 sm:py-5">
                          <Leaf className="h-5 w-5 text-gold sm:h-6 sm:w-6" />
                          <span className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">1 dm²</span>
                          <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-gold/90 sm:text-[10px]">
                            de bosque
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {phase === 'ready' && (
                    <motion.div
                      className="absolute inset-x-0 bottom-0 z-30 flex items-end justify-between gap-3 p-4 sm:p-6"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: prefersReducedMotion ? 0.1 : 0.4 }}
                    >
                      <div className="rounded-full border border-white/15 bg-black/35 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80 backdrop-blur">
                        {refCode || 'Land Dollar'}
                      </div>
                      <div className="flex items-center gap-1.5 rounded-full border border-gold/35 bg-[#02140f]/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-gold backdrop-blur">
                        <Sparkles className="h-3.5 w-3.5" />
                        Semilla activa
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>

            <div className="min-h-[9rem] pt-6 sm:min-h-[8rem]" aria-live="polite">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${phase}-action`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: prefersReducedMotion ? 0.1 : 0.25 }}
                  className="flex flex-col items-center text-center"
                >
                  <p className="text-xs font-medium text-white/45 sm:text-sm">{content.hint}</p>

                  {phase === 'ready' ? (
                    <>
                      <Button
                        asChild
                        variant="gold"
                        size="lg"
                        className="group mt-5 w-full rounded-full px-8 text-base shadow-glow hover:shadow-glow-lg sm:w-auto"
                      >
                        <Link to="/auth">
                          Registrar mi semilla
                          <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                        </Link>
                      </Button>
                      <p className="mt-3 text-[11px] text-white/35">
                        Guardamos tu código <span className="font-semibold text-white/60">{refCode || 'Land Dollar'}</span> en este dispositivo.
                      </p>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPhase('ready')}
                      className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2 text-xs font-semibold text-white/70 transition-colors hover:border-gold/40 hover:text-gold"
                    >
                      Saltar animación
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-6 flex items-center justify-center gap-2 sm:mt-8 sm:gap-3">
              {STEPS.map((step, index) => {
                const isActive = step.id === phase;
                const isDone = index < phaseIndex;
                return (
                  <React.Fragment key={step.id}>
                    <div className={`flex items-center gap-2 ${isActive ? 'text-white' : 'text-white/35'}`}>
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-bold ${
                          isActive
                            ? 'border-gold bg-gold text-[#02140f]'
                            : isDone
                              ? 'border-gold/40 bg-gold/10 text-gold'
                              : 'border-white/15 bg-white/5 text-white/40'
                        }`}
                      >
                        {isDone ? <Check className="h-3.5 w-3.5" /> : step.number}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">{step.label}</span>
                    </div>
                    {index < STEPS.length - 1 && (
                      <span className={`h-px w-5 sm:w-10 ${isDone ? 'bg-gold/50' : 'bg-white/15'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </main>

        <footer className="flex flex-col items-center justify-between gap-2 border-t border-white/10 pt-5 text-[9px] uppercase tracking-[0.18em] text-white/30 sm:flex-row sm:text-[10px]">
          <span>Reforestal eG · Myzel 3.0</span>
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-gold/70" />
            Sin tarjeta. Sin barreras.
          </span>
        </footer>
      </div>
    </div>
  );
};

export default GoldenHour;
