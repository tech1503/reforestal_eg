import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';
import { Wallet, Coins, Sparkles } from 'lucide-react';
import LandDollarDisplay from '@/components/LandDollarDisplay';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useFinancial } from '@/contexts/FinancialContext';
import { supabase } from '@/lib/customSupabaseClient';
import { formatNumber } from '@/lib/utils';

const MyzelGiftPanel = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  // TAREA 2: MISMA variable que usa el Dashboard (impactCredits === balance de ic_ledger).
  // Antes se leía `lifoBalance` que NO existe en FinancialContext -> siempre 0.
  const { impactCredits } = useFinancial();

  const bonosDisponibles = Number(impactCredits) || 0;

  const [giftType, setGiftType] = useState('');
  const [pointsAmount, setPointsAmount] = useState('');
  const [participationAmount, setParticipationAmount] = useState('');
  const [digitalProductId, setDigitalProductId] = useState('');
  const [giftShortCode, setGiftShortCode] = useState(''); 
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    setGiftShortCode('');

    try {
      if (giftType === 'points') {
        const amount = parseInt(pointsAmount, 10);
        if (isNaN(amount) || amount <= 0) {
          toast({ variant: 'destructive', title: t('common.error', 'Error'), description: t('myzel.invalid_amount', 'Introduce una cantidad válida.') });
          setLoading(false);
          return;
        }

        // Llamada REAL a la base de datos (RPC)
        const { data, error } = await supabase.rpc('generate_points_gift_link', {
          p_user_id: user.id,
          p_amount: amount,
        });

        if (error) throw error;

        // Éxito: Guardamos el código mágico generado
        setGiftShortCode(data); 
        toast({ title: t('common.success', 'Éxito'), description: t('myzel.gift_generated', '¡Regalo generado con éxito!') });

      } else {
        // Aviso para Participaciones, Misiones y Productos Digitales que conectaremos luego
        toast({ title: t('myzel.coming_soon', 'Próximamente'), description: t('myzel.in_development', 'Esta opción se conectará en la próxima fase.') });
      }
    } catch (error) {
      console.error("Error del RPC:", error);
      // Detalle completo del error (PostgREST/Postgres) para poder debugear el SQL
      const errorDetail = [error?.code, error?.message || error?.details || error?.hint]
        .filter(Boolean)
        .join(' · ');

      toast({
        variant: 'destructive',
        title: t('common.error', 'Error al generar regalo'),
        description: errorDetail || t('myzel.gift_error_default', 'Error desconocido al generar el regalo.')
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-3xl mx-auto p-8 bg-gradient-to-br from-[#053127] to-[#5b8370] text-white rounded-xl shadow-xl"
    >
      <h2 className="text-3xl font-bold text-center mb-6">{t('myzel.title', 'Mi Red / Myzel')}</h2>
      <p className="text-center mb-6 text-sm">{t('myzel.subtitle', 'Construye una red horizontal. Regala, comparte y crece en equipo.')}</p>

      <div className="space-y-6">
        {/* ===================== TU BILLETERA MYZEL (Premium) ===================== */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-2"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/30 to-amber-400/20 border border-emerald-400/40 shadow-glow">
                <Wallet className="w-4 h-4 text-emerald-300" />
              </div>
              <h3 className="text-base font-black tracking-tight text-white">
                {t('myzel.wallet.title', 'Tu Billetera Myzel')}
              </h3>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-200/90 bg-white/10 border border-emerald-400/30 px-2.5 py-1 rounded-full">
              {t('myzel.wallet.synced', 'Sincronizada con tu Dashboard')}
            </span>
          </div>
          <p className="text-xs text-white/60 mb-3">
            {t('myzel.wallet.subtitle', 'Saldo real leído desde la misma fuente que usa tu Dashboard.')}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* --- Bonos Disponibles --- */}
            <div className="relative overflow-hidden rounded-2xl bg-card border border-emerald-500/50 shadow-premium">
              <div className="pointer-events-none absolute -top-12 -right-12 w-32 h-32 rounded-full bg-emerald-500/25 blur-2xl" />
              <div className="relative p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    {t('myzel.wallet.bonos_label', 'Bonos Disponibles')}
                  </span>
                </div>

                <div className="flex items-end gap-2">
                  <span className="text-4xl font-black leading-none tabular-nums text-emerald-600 dark:text-emerald-300">
                    {formatNumber(bonosDisponibles)}
                  </span>
                  <span className="pb-1 text-xs font-bold uppercase tracking-wider text-emerald-600/80 dark:text-emerald-300/80">
                    {t('myzel.wallet.bonos_unit', 'bonos')}
                  </span>
                </div>

                <div className="mt-3 h-1.5 w-full rounded-full bg-emerald-500/15 overflow-hidden">
                  <div className="h-full w-full bg-gradient-to-r from-emerald-500 to-emerald-300" />
                </div>

                <p className="mt-2 text-[11px] text-muted-foreground">
                  {t('myzel.wallet.bonos_hint', 'Disponibles para regalar en tu red Myzel.')}
                </p>
              </div>
            </div>

            {/* --- Participaciones (dm²) --- */}
            <div className="relative overflow-hidden rounded-2xl bg-card border border-gold/50 shadow-premium">
              <div className="pointer-events-none absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gold/25 blur-2xl" />
              <div className="relative p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-gold-600 dark:text-gold-200" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    {t('myzel.wallet.participations_label', 'Participaciones (dm²)')}
                  </span>
                </div>

                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black leading-none tabular-nums text-gold-600 dark:text-gold-200">
                    {t('myzel.wallet.participations_value', '0 - Próximamente')}
                  </span>
                </div>

                <div className="mt-3 h-1.5 w-full rounded-full bg-gold/15 overflow-hidden">
                  <div className="h-full w-1/4 bg-gradient-to-r from-gold to-gold-200" />
                </div>

                <p className="mt-2 text-[11px] text-muted-foreground">
                  {t('myzel.wallet.participations_hint', 'Conversión a dm² habilitada en la próxima fase.')}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
        {/* ===================================================================== */}

        {/* Selector de tipo de regalo */}
        <div className="flex flex-col space-y-4">
          <select
            value={giftType}
            onChange={(e) => setGiftType(e.target.value)}
            className="w-full mb-4 p-2 rounded-md bg-white text-[#053127]"
          >
            <option value="" disabled>{t('myzel.select_gift', 'Selecciona un regalo...')}</option>
            <option value="points">{t('myzel.option_points', 'Cantidad de puntos/bonos (Descuenta del LIFO)')}</option>
            <option value="participation">{t('myzel.option_participation', '1 dm² = (Participación en la Cooperativa)')}</option>
            <option value="digital">{t('myzel.option_digital', 'Un producto digital del Trueque (E-commerce)')}</option>
            <option value="mission">{t('myzel.option_mission', 'Regalar una Misión (Desbloquear misión a un amigo)')}</option>
          </select>

          {/* Campos dinámicos según el tipo seleccionado */}
          {giftType === 'points' && (
            <div>
              <Input
                value={pointsAmount}
                placeholder={t('myzel.points_placeholder', 'Cantidad de puntos')}
                onChange={(e) => setPointsAmount(e.target.value)}
                className="mb-2"
                required
              />
              <Button onClick={handleSubmit} disabled={loading} className="w-full bg-[#063127] hover:bg-[#0a4d3d] text-white shadow-lg">
                {loading ? (
                  <><span className="inline-block mr-2 animate-spin rounded-full h-5 w-5 text-emerald-500"></span>{t('dashboard.processing', 'Procesando...')}</>
                ) : (
                  t('myzel.send_gift', 'Enviar Regalo')
                )}
              </Button>
            </div>
          )}

          {giftType === 'participation' && (
            <div>
              <Input
                value={participationAmount}
                placeholder={t('myzel.participation_placeholder', 'Área en dm² (ej. 100)')}
                onChange={(e) => setParticipationAmount(e.target.value)}
                className="mb-2"
                required
              />
              <Button onClick={handleSubmit} disabled={loading} className="w-full bg-[#063127] hover:bg-[#0a4d3d] text-white shadow-lg">
                {t('myzel.send_gift', 'Enviar Regalo')}
              </Button>
            </div>
          )}

          {giftType === 'digital' && (
            <div>
              <Input
                value={digitalProductId}
                placeholder={t('myzel.digital_placeholder', 'ID del producto digital (ej. prod_123)')}
                onChange={(e) => setDigitalProductId(e.target.value)}
                className="mb-2"
                required
              />
              <Button onClick={handleSubmit} disabled={loading} className="w-full bg-[#063127] hover:bg-[#0a4d3d] text-white shadow-lg">
                {t('myzel.send_gift', 'Enviar Regalo')}
              </Button>
            </div>
          )}
          
          {giftType === 'mission' && (
            <div>
              <Button onClick={handleSubmit} disabled={loading} className="w-full bg-[#063127] hover:bg-[#0a4d3d] text-white shadow-lg mt-2">
                {t('myzel.send_gift', 'Enviar Regalo')}
              </Button>
            </div>
          )}
        </div>

        {/* Mensaje de éxito y Renderizado del Regalo */}
        {giftShortCode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-8 flex flex-col items-center"
          >
            <div className="bg-white/90 border-2 border-emerald-500 rounded-xl p-6 text-center w-full shadow-2xl mb-8">
              <h3 className="text-xl font-bold text-[#053127] mb-2">
                {t('myzel.gift_title', '¡Aquí tienes tu Regalo! 🎁')}
              </h3>
              <p className="text-emerald-700 font-medium mb-6">
                {t('myzel.gift_desc', 'Descarga el Land Dollar o copia el enlace para enviarlo.')}
              </p>
              
              <div className="transform origin-top w-full overflow-visible">
                 <LandDollarDisplay user={user} giftShortCode={giftShortCode} />
              </div>

              <Button
                onClick={() => {
                  setGiftShortCode('');
                  setPointsAmount('');
                  setParticipationAmount('');
                  setDigitalProductId('');
                  setGiftType('');
                  setLoading(false);
                }}
                className="mt-8 text-sm bg-emerald-700 hover:bg-emerald-800 text-white rounded-full px-8 shadow-md"
              >
                {t('myzel.close_create_another', 'Cerrar y crear otro regalo')}
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default MyzelGiftPanel;