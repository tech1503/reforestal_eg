import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Check, Crown, Shield, Zap, Leaf, Sparkles, ChevronRight, Star, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const SubscriptionSection = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [isAnnual, setIsAnnual] = useState(false);

  const plans = [
    {
      id: 'explorador',
      name: 'Explorador/a',
      priceMonthly: 4.99,
      priceAnnual: 49.90,
      area: '1 m²',
      grades: '1º Grado desbloqueado',
      icon: Leaf,
      color: 'from-emerald-500 to-teal-400',
      bg: 'bg-emerald-950/40',
      border: 'border-emerald-400/20',
      text: 'text-emerald-300',
    },
    {
      id: 'guardian',
      name: 'Guardián/a',
      priceMonthly: 14.99,
      priceAnnual: 149.90,
      area: '4 m²',
      grades: '1.er y 2º Grado desbloqueados',
      icon: Shield,
      color: 'from-blue-500 to-indigo-400',
      bg: 'bg-blue-950/40',
      border: 'border-blue-400/20',
      text: 'text-blue-300',
      featured: true,
    },
    {
      id: 'campeon',
      name: 'Campeón/a',
      priceMonthly: 49.99,
      priceAnnual: 499.90,
      area: '15 m²',
      grades: '1.er a 3º Grado desbloqueados',
      icon: Zap,
      color: 'from-violet-500 to-fuchsia-400',
      bg: 'bg-violet-950/40',
      border: 'border-violet-400/20',
      text: 'text-violet-300',
    },
    {
      id: 'paladin',
      name: 'Paladín/a',
      priceMonthly: 97.99,
      priceAnnual: 979.90,
      area: '30 m²',
      grades: 'Los 4 Grados desbloqueados',
      icon: Crown,
      color: 'from-amber-400 to-rose-400',
      bg: 'bg-amber-950/40',
      border: 'border-amber-400/20',
      text: 'text-amber-300',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#063127] via-[#0a2e1f] to-[#063127] text-white font-sans">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Badge className="bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-300 border-amber-400/30 mb-6 font-black text-xs tracking-[0.2em] uppercase px-4 py-1.5 shadow-glow">{t('subscription.badge', 'Myzel 3.0 — Freemium')}</Badge>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-b from-white via-[#c2d2c1] to-amber-300 drop-shadow-sm">
              {t('subscription.title', 'Suscripción Freemium')}
            </h1>
            <p className="text-lg md:text-xl text-[#c2d2c1]/80 max-w-2xl mx-auto font-light leading-relaxed">
              {t('subscription.subtitle', 'Elige tu nivel de impacto. Cada plan desbloquea m² reales, grados de misión y acceso al ecosistema Micelio.')}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Toggle mensual / anual */}
      <div className="max-w-6xl mx-auto px-6 -mt-8 mb-12 relative z-10">
        <div className="bg-[#063127]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-black text-white mb-1">{t('subscription.billing_cycle_title', 'Selecciona tu ciclo de facturación')}</h2>
            <p className="text-sm text-white/50">{t('subscription.billing_cycle_desc', 'Ahorra hasta un 20% con pago anual. Cambia el interruptor para ver precios.')}</p>
          </div>
          <div className="flex items-center gap-4 bg-white/5 rounded-xl px-4 py-2 border border-white/10">
            <span className={`text-sm font-bold transition-colors ${!isAnnual ? 'text-white' : 'text-white/40'}`}>{t('subscription.cycle.monthly', 'Mensual')}</span>
            <Switch
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
              className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-amber-400 data-[state=checked]:to-rose-400 h-6 w-11"
            />
            <span className={`text-sm font-bold transition-colors ${isAnnual ? 'text-amber-300' : 'text-white/40'}`}>{t('subscription.cycle.annual', 'Anual')}</span>
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start auto-rows-min">
          {plans.map((plan, idx) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
            >
              <Card className={`relative overflow-hidden h-full flex flex-col ${plan.featured ? 'border-amber-400/40 shadow-glow ring-1 ring-amber-400/20' : `border-white/10 shadow-lg hover:border-white/20`} bg-gradient-to-b ${plan.bg} backdrop-blur-sm transition-all hover:-translate-y-1`}>
                {plan.featured && (
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-400 to-rose-400 text-[#063127] text-[10px] font-black px-3 py-1 rounded-bl-xl shadow-glow z-10 flex items-center gap-1">
                    <Star className="w-3 h-3" /> {t('subscription.most_popular', 'MÁS POPULAR')}
                  </div>
                )}
                <CardContent className="p-6 md:p-7 flex-1 flex flex-col">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center shadow-glow mb-4`}>
                    <plan.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className={`text-2xl font-black mb-1 ${plan.text}`}>{plan.name}</h3>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-3xl font-black text-white tracking-tight">€{isAnnual ? plan.priceAnnual.toFixed(2) : plan.priceMonthly.toFixed(2)}</span>
                    <span className="text-sm text-white/50 font-medium">{isAnnual ? '/año' : '/mes'}</span>
                  </div>
                  {isAnnual && (
                    <div className="text-xs text-amber-300 font-medium mb-4">Ahorra €{(plan.priceMonthly * 12 - plan.priceAnnual).toFixed(2)} al año</div>
                  )}

                  <div className="space-y-3 mb-6 flex-1">
                    <div className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5 border border-white/10">
                      <Leaf className="w-4 h-4 text-emerald-300 shrink-0" />
                      <span className="text-sm font-medium text-white">{plan.area} directo</span>
                    </div>
                    <div className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5 border border-white/10">
                      <Lock className={`w-4 h-4 shrink-0 ${plan.id === 'explorador' ? 'text-emerald-300' : plan.id === 'guardian' ? 'text-blue-300' : plan.id === 'campeon' ? 'text-violet-300' : 'text-amber-300'}`} />
                      <span className="text-sm font-medium text-white">{plan.grades}</span>
                    </div>
                    <ul className="space-y-2 pt-2">
                      {[
                        'Acceso a misiones de la categoría desbloqueada',
                        'Puntos inmaduros (Canasta Verde) con LIFO',
                        'Seguimiento de impacto y certificación Land Dollar',
                        'Soporte de la comunidad Reforestal eG',
                      ].map((feat, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                          <Check className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                          <span>{t('subscription.plans.' + plan.id + '.feature_' + (i + 1), feat)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button
                    onClick={() => {
                      // Simulación de selección sin bloque de pago
                      alert(`Plan seleccionado: ${plan.name} — €${isAnnual ? plan.priceAnnual.toFixed(2) : plan.priceMonthly.toFixed(2)} / ${isAnnual ? 'año' : 'mes'}. El paso de pago se conectará en Fase 3.`);
                    }}
                    className={`w-full h-12 font-black rounded-xl text-base shadow-glow transition-all active:scale-[0.98] ${plan.featured ? 'bg-gradient-to-r from-amber-400 to-rose-400 text-[#063127] hover:brightness-110' : 'bg-white/10 text-white border border-white/20 hover:bg-white/15 hover:border-white/40'}`}
                  >
                    {t('subscription.select_plan', 'Seleccionar Plan')} <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Footer info */}
      <div className="max-w-4xl mx-auto px-6 pb-12 text-center">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
          <h3 className="text-lg font-black text-white mb-2 flex items-center justify-center gap-2"><Sparkles className="w-5 h-5 text-amber-300" /> {t('subscription.model_title', 'Modelo Freemium Myzel 3.0')}</h3>
          <p className="text-sm text-white/60 leading-relaxed">{t('subscription.model_desc', 'Todos los planes incluyen acceso base a misiones. El pago activa los grados desbloqueados y aumenta los m² protegidos directos. No hay barrera de entrada: puedes explorar con la Canasta Verde (Inmadura) antes de comprometerte.')}</p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionSection;
