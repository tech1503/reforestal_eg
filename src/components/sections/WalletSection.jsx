import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  LandPlot,
  Leaf,
  Coins,
  ShieldCheck,
  Sprout,
  Trees,
  CalendarClock,
  CircleDollarSign,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useFinancial } from '@/contexts/FinancialContext';
import { supabase } from '@/lib/customSupabaseClient';
import { cn, formatNumber } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import MyzelGraph from '@/components/myzel/MyzelGraph';
import useMyzelNetwork from '@/hooks/useMyzelNetwork';

export default function WalletSection() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const {
    balance,
    immatureBalance,
    matureBalance,
    landDollar,
  } = useFinancial();

  const [lots, setLots] = useState([]);
  const [lotsError, setLotsError] = useState(false);
  const [harvestOpen, setHarvestOpen] = useState(false);

  const isVerified = profile?.membership_stage === 'VERIFIED_MEMBER_15GENG';
  const reservedDm2 = landDollar ? 1 : 0;
  const consolidatedDm2 = 0; // Aún no existen cosechas §15b registradas (REQ-03); la vista se alimentará de share_conversions.
  const totalPoints = Number(balance) || 0;
  const mature = Number(matureBalance) || 0;
  const immature = Number(immatureBalance) || 0;
  const dm2Harvestable = Math.floor(mature / 100);
  const matureRemainder = mature % 100;

  const { luminosity, communityXp, loading: myzelLoading } = useMyzelNetwork();

  useEffect(() => {
    let mounted = true;
    if (!user?.id) return undefined;

    const fetchLots = async () => {
      try {
        const { data, error } = await supabase.rpc('wallet_lifo_lots', { p_user_id: user.id });
        if (error) throw error;
        if (mounted) {
          setLots(Array.isArray(data) ? data : []);
          setLotsError(false);
        }
      } catch (err) {
        console.warn('[Wallet] wallet_lifo_lots no disponible:', err?.message || err);
        if (mounted) {
          setLots([]);
          setLotsError(true);
        }
      }
    };

    fetchLots();
    const channel = supabase
      .channel(`wallet_lots_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ic_ledger', filter: `user_id=eq.${user.id}` }, fetchLots)
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const immatureLots = useMemo(
    () => lots.filter((l) => !l.is_mature).slice(0, 4),
    [lots]
  );

  return (
    <div className="space-y-6 pb-10">
      {/* Encabezado de la Cartera */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#5b8370] dark:text-[#A3C9A8]">
            {t('wallet.overline', 'REQ-02 · Tokenomics')}
          </p>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[#1A1612] dark:text-[#F4F1EA] mt-1">
            {t('wallet.title', 'La Cartera de 3 Cuentas')}
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl mt-1">
            {t('wallet.subtitle', 'Suelo consolidado, puntos inmaduros en maduración LIFO y puntos maduros listos para cosechar.')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-border bg-card px-4 py-2.5 text-right shadow-sm">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{t('wallet.total_points', 'Total')}</p>
            <p className="text-xl font-black text-[#1A1612] dark:text-[#F4F1EA] leading-tight">{formatNumber(totalPoints)} P</p>
          </div>
          <div className="rounded-2xl border border-amber-500/30 bg-amber-50 dark:bg-amber-950/30 px-4 py-2.5 text-right shadow-sm">
            <p className="text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400 font-semibold">{t('wallet.harvestable', 'dm² cosechables')}</p>
            <p className="text-xl font-black text-amber-700 dark:text-amber-300 leading-tight">{dm2Harvestable}</p>
          </div>
        </div>
      </div>

      {/* PANELES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Panel 1 — Suelo en Propiedad */}
        <section
          aria-labelledby="panel-suelo"
          className="rounded-2xl bg-[#F4F1EA] text-[#1A1612] border border-[#1A1612]/10 shadow-lg p-5 flex flex-col relative overflow-hidden"
        >
          <div className="absolute -right-6 -bottom-6 opacity-[0.08] pointer-events-none">
            <Trees size={180} strokeWidth={1.2} />
          </div>

          <div className="flex items-center justify-between relative">
            <p id="panel-suelo" className="text-[10px] font-black uppercase tracking-[0.22em] text-[#2E4F3E] inline-flex items-center gap-1.5">
              <LandPlot size={13} /> {t('wallet.panel_soil', 'Suelo en Propiedad')}
            </p>
            {isVerified ? (
              <Badge className="bg-[#2E4F3E] text-[#F4F1EA] border-0 text-[10px] font-bold px-2 py-0.5">
                <ShieldCheck size={11} className="mr-1" /> §15b
              </Badge>
            ) : (
              <Badge className="bg-amber-600/90 text-white border-0 text-[10px] font-bold px-2 py-0.5">
                <Sprout size={11} className="mr-1" /> {t('wallet.seed', 'Semilla')}
              </Badge>
            )}
          </div>

          <div className="mt-4 relative">
            <p className="text-6xl font-black tracking-tight leading-none">
              {consolidatedDm2.toFixed(1)}
              <span className="text-2xl font-extrabold align-top ml-1">dm²</span>
            </p>
            <p className="text-xs font-medium text-[#1A1612]/70 mt-1.5">
              {t('wallet.soil_consolidated', 'Participaciones sociales consolidadas e inalienables')}
            </p>
          </div>

          <div className="mt-4 rounded-xl bg-[#1A1612]/[0.06] border border-[#1A1612]/10 px-4 py-3 relative">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#2E4F3E]">{t('wallet.soil_reserved', 'En reserva')}</span>
              <span className="text-xl font-black">{reservedDm2} <span className="text-sm font-bold">dm²</span></span>
            </div>
            <p className="text-[11px] leading-snug text-[#1A1612]/70 mt-1">
              {t('wallet.soil_reserved_hint', 'Tu suelo reservado de la Golden Hour. Se transfiere al capital social al completar la verificación GenG.')}
            </p>
          </div>

          <p className="text-[10px] leading-snug text-[#1A1612]/60 mt-auto pt-3 border-t border-[#1A1612]/10">
            {t('wallet.soil_geng', 'Las cosechas de Puntos Maduros (100 P = 1 dm²) se formalizan mediante el formulario GenG y la aprobación trimestral del Libro de Socios (§ 30 GenG).')}
          </p>
        </section>

        {/* Panel 2 — Puntos Inmaduros (Bolsa Verde) */}
        <section
          aria-labelledby="panel-verde"
          className="rounded-2xl text-[#F4F1EA] border border-[#2E4F3E] shadow-lg p-5 flex flex-col bg-gradient-to-br from-[#10241A] via-[#16281E] to-[#1A1612]"
        >
          <div className="flex items-center justify-between">
            <p id="panel-verde" className="text-[10px] font-black uppercase tracking-[0.22em] text-[#A3C9A8] inline-flex items-center gap-1.5">
              <Leaf size={13} /> {t('wallet.panel_immature', 'Puntos Inmaduros · Bolsa Verde')}
            </p>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#A3C9A8]/70">&lt; 90 {t('wallet.days', 'días')}</span>
          </div>

          <div className="mt-4 flex items-end justify-between gap-3">
            <p className="text-6xl font-black tracking-tight leading-none text-[#A3C9A8]" style={{ textShadow: '0 0 32px rgba(163,201,168,0.35)' }}>
              {formatNumber(immature)}
              <span className="text-2xl font-extrabold align-top ml-1">P</span>
            </p>
            <div className="text-right text-[11px] leading-tight text-[#A3C9A8]/80">
              <p className="font-bold">{t('wallet.lifo_badge', 'Consumo LIFO')}</p>
              <p>{t('wallet.lifo_sub', 'lo reciente primero')}</p>
            </div>
          </div>
          <p className="text-[11px] text-[#F4F1EA]/60 mt-1">
            {t('wallet.immature_hint', 'Poder adquisitivo digital pleno: misiones, desbloqueos y donaciones. Aún no convertibles en suelo.')}
          </p>

          {/* Lotes con días restantes */}
          <div className="mt-4 space-y-2.5 flex-1">
            {lotsError && (
              <p className="text-[11px] text-amber-300/90 bg-amber-950/30 border border-amber-500/20 rounded-lg px-3 py-2">
                {t('wallet.lots_unavailable', 'Desglose por lotes no disponible. El saldo se calcula desde ic_ledger.')}
              </p>
            )}
            {!lotsError && immatureLots.length === 0 && (
              <div className="rounded-xl border border-dashed border-[#A3C9A8]/25 px-4 py-5 text-center">
                <Sprout size={22} className="mx-auto text-[#A3C9A8]/60 mb-2" />
                <p className="text-xs text-[#F4F1EA]/70">{t('wallet.lots_empty', 'Aún no hay puntos inmaduros en maduración. Completa misiones para sembrarlos.')}</p>
              </div>
            )}
            {immatureLots.map((lot, idx) => {
              const daysLeft = Number(lot.days_to_maturity) || 0;
              const progress = Math.max(0, Math.min(100, ((90 - daysLeft) / 90) * 100));
              return (
                <div key={lot.lot_id ?? idx} className="rounded-xl bg-black/25 border border-[#A3C9A8]/15 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-bold text-[#F4F1EA] inline-flex items-center gap-1.5">
                      <CalendarClock size={12} className="text-[#A3C9A8]" />
                      +{formatNumber(lot.remaining_amount)} P
                    </span>
                    <span className="text-[#A3C9A8] font-semibold">
                      {daysLeft <= 1
                        ? t('wallet.matures_tomorrow', 'madura mañana')
                        : t('wallet.days_left', '{{days}} días para madurar', { days: daysLeft })}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-[#2E4F3E] to-[#A3C9A8]"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.9, delay: idx * 0.08 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[10px] leading-snug text-[#F4F1EA]/55 mt-3 pt-3 border-t border-white/5">
            {t('wallet.lifo_note', 'Consumo estricto LIFO: cualquier senke digital extrae los lotes más recientes (días 1–89); los lotes antiguos conservan su vencimiento intactos.')}
          </p>
        </section>

        {/* Panel 3 — Puntos Maduros (Bolsa Dorada) */}
        <section
          aria-labelledby="panel-dorada"
          className="rounded-2xl text-[#F4F1EA] border border-amber-400/30 shadow-[0_0_45px_-12px_rgba(207,156,42,0.45)] p-5 flex flex-col bg-gradient-to-br from-[#1A1612] via-[#241D12] to-[#1A1612] relative overflow-hidden"
        >
          <div
            className="absolute inset-0 opacity-[0.15] pointer-events-none"
            style={{ background: 'radial-gradient(circle at 85% 0%, rgba(254,241,167,0.35), transparent 55%)' }}
          />
          <div className="flex items-center justify-between relative">
            <p id="panel-dorada" className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300 inline-flex items-center gap-1.5">
              <Coins size={13} /> {t('wallet.panel_mature', 'Puntos Maduros · Bolsa Dorada')}
            </p>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200/70">≥ 90 {t('wallet.days', 'días')}</span>
          </div>

          <p className="mt-4 text-6xl font-black tracking-tight leading-none text-transparent bg-clip-text bg-gradient-to-b from-[#fef1a7] via-[#cf9c2a] to-[#734b07] relative">
            {formatNumber(mature)}
            <span className="text-2xl font-extrabold align-top ml-1">P</span>
          </p>
          <p className="text-[11px] text-amber-100/60 mt-1 relative">
            {t('wallet.mature_hint', 'Puntos con maduración completa. Los únicos que pueden convertirse en valor real.')}
          </p>

          <div className="mt-4 rounded-xl border border-amber-400/20 bg-black/30 px-4 py-3 relative">
            <div className="flex items-center justify-between text-[11px] text-amber-200/80 font-semibold">
              <span>{t('wallet.next_dm2', 'Hacia tu próxima dm²')}</span>
              <span>{matureRemainder}/100 P</span>
            </div>
            <Progress value={matureRemainder} indicatorClassName="bg-gradient-to-r from-[#8a5a0b] via-[#cf9c2a] to-[#fef1a7]" className="h-2 mt-2 bg-white/10" />
            <p className="text-[10px] text-amber-100/55 mt-1.5">
              {t('wallet.rate', '100 P = 1 dm² de suelo · 10.000 P = 1 m² = 100 participaciones')}
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 relative">
            <div>
              <p className="text-3xl font-black text-amber-200 leading-none">{dm2Harvestable}<span className="text-base font-bold ml-1">dm²</span></p>
              <p className="text-[10px] uppercase tracking-wider text-amber-100/60 font-semibold mt-1">{t('wallet.harvestable_now', 'cosechables ahora')}</p>
            </div>
            <Button
              onClick={() => setHarvestOpen(true)}
              className="bg-gradient-to-b from-[#fef1a7] via-[#cf9c2a] to-[#8a5a0b] text-[#1A1612] font-black border border-amber-200/50 hover:brightness-110 shadow-md"
            >
              <CircleDollarSign size={16} className="mr-1.5" />
              {t('wallet.harvest_cta', 'Cosechar dm²')}
              <ArrowRight size={16} className="ml-1.5" />
            </Button>
          </div>

          <p className="text-[10px] leading-snug text-amber-100/50 mt-auto pt-3 border-t border-amber-400/10 relative">
            {t('wallet.mature_note', 'La cosecha exige verificación GenG (Fase 2) y aprobación trimestral del Consejo. Los puntos maduros nunca se consumen en senkes digitales.')}
          </p>
        </section>
      </div>

      {/* Visualizador 2D del Micelio */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#5b8370] dark:text-[#A3C9A8]">{t('wallet.graph_overline', 'REQ-06 · Red Myzel')}</p>
            <h2 className="text-xl font-extrabold text-[#1A1612] dark:text-[#F4F1EA]">{t('wallet.graph_title', 'Visualizador del Micelio')}</h2>
          </div>
          <p className="hidden md:block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold text-right">
            {t('wallet.graph_split', 'Reparto 50 / 25 / 12,5 / 6,25 / 6,25')}
          </p>
        </div>
        <MyzelGraph
          luminosity={luminosity}
          communityXp={communityXp}
          subscriptionTier={null}
          peers={{}}
          isVerified={isVerified}
        />
        {myzelLoading && (
          <p className="text-[11px] text-muted-foreground mt-2 px-1">{t('wallet.graph_loading', 'Sincronizando tu nodo…')}</p>
        )}
      </div>

      {/* Modal — Cosecha §15b GenG */}
      <Dialog open={harvestOpen} onOpenChange={setHarvestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LandPlot size={18} /> {t('wallet.harvest_title', 'Cosecha de suelo §15b GenG')}
            </DialogTitle>
            <DialogDescription>
              {t('wallet.harvest_desc', 'Canjear 100 Puntos Maduros por 1 dm² de suelo real. Este es el flujo legal completo:')}
            </DialogDescription>
          </DialogHeader>
          <ol className="text-sm space-y-3 list-none">
            {[
              t('wallet.harvest_step1', 'Acumula al menos 100 P maduros (≥ 90 días de maduración). Tienes {{points}} P.', { points: formatNumber(mature) }),
              t('wallet.harvest_step2', 'Firma el formulario de afiliación cooperativa (arts. 15 y 15b GenG): nombre legal, dirección postal, fecha de nacimiento y aceptación de estatutos.'),
              t('wallet.harvest_step3', 'El Consejo de Administración aprueba trimestralmente el lote en el Libro de Socios (§ 30 GenG): tu dm² pasa a capital social (Geschüftsguthaben).'),
              t('wallet.harvest_step4', 'El decímetro queda inscrito a tu nombre en el registro cooperativo e imputado a Pastaza (Ecuador).'),
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="shrink-0 w-6 h-6 rounded-full bg-amber-500/90 text-[#1A1612] text-[11px] font-black flex items-center justify-center">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <div className={cn('rounded-xl border px-4 py-2.5 text-xs', isVerified ? 'border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300' : 'border-amber-500/30 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300')}>
            {isVerified
              ? t('wallet.harvest_verified', 'Tu verificación GenG está completa. Tu cosecha quedará registrada para el próximo corte trimestral.')
              : t('wallet.harvest_unverified', 'Aún no eres miembro verificado. Te pediremos los datos GenG al solicitar tu primera cosecha (Fase 2 de membresía).')}
          </div>
          <DialogFooter>
            <Button onClick={() => setHarvestOpen(false)} className="bg-[#1A1612] text-[#F4F1EA] hover:bg-[#2E4F3E]">
              {t('wallet.harvest_ack', 'Entendido')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
