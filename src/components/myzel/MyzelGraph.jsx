import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Sprout, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { resolveMyzelGrades, GRADE_REQUIRED_PLAN } from '@/utils/myzelGrades';

const VIEW_W = 880;
const VIEW_H = 620;
const CX = 440;
const CY = 322;

const RING_RADII = [76, 128, 180, 232];
const SLOTS_PER_RING = [6, 8, 10, 12];
const RING_OFFSETS = [0, 22, 45, 12];

const PALETTE = {
  bg: '#1A1612',
  deep: '#2E4F3E',
  accent: '#A3C9A8',
  cream: '#F4F1EA',
  muted: '#8B8577',
};

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

const degSlots = (grade) => SLOTS_PER_RING[grade - 1];
const slotAngle = (grade, idx) => -90 + RING_OFFSETS[grade - 1] + idx * (360 / degSlots(grade));

const PLAN_NAMES = { guardian: 'Guardián/a', campeon: 'Campeón/a', paladin: 'Paladín/a' };

export default function MyzelGraph({
  luminosity = 1,
  communityXp = 0,
  subscriptionTier = null,
  pointsUnlockedGrades = [],
  peers = {},
  isVerified = false,
  className,
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  const [unlockTarget, setUnlockTarget] = useState(null);

  const grades = useMemo(
    () => resolveMyzelGrades({ subscriptionTier, pointsUnlockedGrades }),
    [subscriptionTier, pointsUnlockedGrades]
  );
  const unlockedByGrade = useMemo(
    () => Object.fromEntries(grades.map((g) => [g.grade, g])),
    [grades]
  );

  const peersByGrade = useMemo(
    () => ({
      1: Math.max(0, Number(peers?.degree1) || 0),
      2: Math.max(0, Number(peers?.degree2) || 0),
      3: Math.max(0, Number(peers?.degree3) || 0),
      4: Math.max(0, Number(peers?.degree4) || 0),
    }),
    [peers]
  );

  const totalRealPeers = Object.values(peersByGrade).reduce((a, b) => a + b, 0);
  const isPreview = totalRealPeers === 0;

  const previewNodes = useMemo(
    () => [
      { slot: 0, entropy: false },
      { slot: 2, entropy: true },
      { slot: 4, entropy: false },
    ],
    []
  );

  const lum = Math.max(0.2, Math.min(1, luminosity));
  const lumPct = Math.round(lum * 100);
  const haloOpacity = 0.25 + lum * 0.75;

  const unlockViaDetail = unlockTarget ? {
    plan: PLAN_NAMES[GRADE_REQUIRED_PLAN[unlockTarget]],
  } : null;

  return (
    <div className={cn('rounded-2xl border overflow-hidden shadow-2xl', className)} style={{ background: PALETTE.bg, borderColor: `${PALETTE.deep}` }}>
      <style>{`
        @keyframes myzelHaloPulse {
          0%, 100% { opacity: .55; }
          50% { opacity: 1; }
        }
        @keyframes myzelDashSpin {
          to { stroke-dashoffset: -28; }
        }
        .myzel-halo { animation: myzelHaloPulse 3.6s ease-in-out infinite; }
        .myzel-locked-ring { animation: myzelDashSpin 8s linear infinite; }
      `}</style>

      {/* Header del panel */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-1">
        <div>
          <h3 className="text-lg font-extrabold tracking-tight" style={{ color: PALETTE.cream }}>
            {t('myzel_graph.title', 'Mi Micelio')}
          </h3>
          <p className="text-xs" style={{ color: PALETTE.muted }}>
            {t('myzel_graph.subtitle', 'Red reticular omnidireccional · 4 grados de vecindad')}
            {isVerified ? ` · ${t('myzel_graph.verified', 'Miembro verificado §15b')}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider border"
            style={{ color: PALETTE.accent, borderColor: `${PALETTE.accent}55`, background: `${PALETTE.deep}55` }}
            title={t('myzel_graph.luminosity_hint', 'Completar una misión o contratar un plan devuelve tu luminosidad al 100%.')}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: PALETTE.accent, boxShadow: `0 0 8px ${PALETTE.accent}` }} />
            {t('myzel_graph.luminosity', 'Luminosidad')} {lumPct}%
          </span>
          {isPreview && (
            <span
              className="inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider border"
              style={{ color: PALETTE.cream, borderColor: `${PALETTE.cream}33`, background: `${PALETTE.cream}0d` }}
            >
              {t('myzel_graph.preview', 'Vista previa')}
            </span>
          )}
        </div>
      </div>

      {/* Lienzo 2D */}
      <div className="px-2 sm:px-4">
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="w-full h-auto select-none" role="img" aria-label={t('myzel_graph.title', 'Mi Micelio')}>
          <defs>
            <radialGradient id="youHalo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={PALETTE.accent} stopOpacity="0.9" />
              <stop offset="45%" stopColor={PALETTE.accent} stopOpacity="0.35" />
              <stop offset="100%" stopColor={PALETTE.accent} stopOpacity="0" />
            </radialGradient>
            <radialGradient id="youCore" cx="38%" cy="35%" r="75%">
              <stop offset="0%" stopColor={PALETTE.accent} />
              <stop offset="55%" stopColor={PALETTE.deep} />
              <stop offset="100%" stopColor="#16281E" />
            </radialGradient>
            <radialGradient id="peerHalo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={PALETTE.accent} stopOpacity="0.85" />
              <stop offset="100%" stopColor={PALETTE.accent} stopOpacity="0" />
            </radialGradient>
            <radialGradient id="entropyNode" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={PALETTE.muted} />
              <stop offset="100%" stopColor="#3A362E" />
            </radialGradient>
            <radialGradient id="soilGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={PALETTE.accent} stopOpacity="0.14" />
              <stop offset="100%" stopColor={PALETTE.accent} stopOpacity="0" />
            </radialGradient>
            <filter id="nodeBlur" x="-120%" y="-120%" width="340%" height="340%">
              <feGaussianBlur stdDeviation="9" />
            </filter>
          </defs>

          {/* Suelo de humus */}
          <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill={PALETTE.bg} />
          <circle cx={CX} cy={CY} r="310" fill="url(#soilGlow)" />

          {/* Red reticular: anillos de 1 a 4 grados */}
          {RING_RADII.map((radius, i) => {
            const grade = i + 1;
            const unlocked = unlockedByGrade[grade]?.unlocked;
            return (
              <g key={grade}>
                <circle
                  cx={CX}
                  cy={CY}
                  r={radius}
                  fill="none"
                  stroke={unlocked ? PALETTE.accent : PALETTE.cream}
                  strokeOpacity={unlocked ? 0.32 : 0.16}
                  strokeWidth={unlocked ? 1.6 : 1.2}
                  strokeDasharray={unlocked ? 'none' : '3 11'}
                  className={unlocked ? undefined : 'myzel-locked-ring'}
                />
                <text
                  x={CX}
                  y={unlocked ? CY - radius - 6 : CY - radius - 25}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="700"
                  fill={unlocked ? PALETTE.accent : PALETTE.muted}
                  fillOpacity={unlocked ? 0.85 : 0.8}
                  letterSpacing="2"
                  style={{ textTransform: 'uppercase' }}
                >
                  {`GRADO ${grade}`}
                </text>
              </g>
            );
          })}

          {/* Filamentos de micelio (hilos finos hacia el nodo central) */}
          {RING_RADII.map((radius, i) => {
            const grade = i + 1;
            const strands = [0, 1, 2].map((k) => {
              const a = (-150 + k * 130 + grade * 18) * (Math.PI / 180);
              const x1 = CX + radius * Math.cos(a);
              const y1 = CY + radius * Math.sin(a);
              const mx = (CX + x1) / 2 + (k % 2 === 0 ? 22 : -22);
              const my = (CY + y1) / 2;
              return (
                <path
                  key={k}
                  d={`M ${x1} ${y1} Q ${mx} ${my} ${CX} ${CY}`}
                  fill="none"
                  stroke={PALETTE.accent}
                  strokeOpacity={0.07}
                  strokeWidth="1.1"
                />
              );
            });
            return <g key={`strands-${grade}`}>{strands}</g>;
          })}

          {/* Nodos por grado */}
          {RING_RADII.map((radius, i) => {
            const grade = i + 1;
            const unlocked = unlockedByGrade[grade]?.unlocked;
            const slots = degSlots(grade);
            const realPeers = peersByGrade[grade];
            const isPreviewGrade = isPreview && grade === 1;
            const previewMap = new Map(previewNodes.map((p) => [p.slot, p]));

            const elements = [];

            for (let slot = 0; slot < slots; slot += 1) {
              const angle = slotAngle(grade, slot);
              const { x, y } = polarToCartesian(CX, CY, radius, angle);

              if (!unlocked) {
                // Silueta atenuada tras el candado
                if (slot % 3 === 0) {
                  elements.push(
                    <circle key={`sil-${grade}-${slot}`} cx={x} cy={y} r="10" fill={PALETTE.cream} fillOpacity="0.06" />
                  );
                }
                continue;
              }

              // Nodo real enlazado
              if (slot < realPeers) {
                elements.push(
                  <g
                    key={`real-${grade}-${slot}`}
                    className="cursor-pointer"
                    role="button"
                    tabIndex={0}
                    aria-label={`Grado ${grade}, contacto ${slot + 1}`}
                    onClick={() => setSelected({ kind: 'real', grade, index: slot + 1 })}
                    onKeyDown={(e) => e.key === 'Enter' && setSelected({ kind: 'real', grade, index: slot + 1 })}
                  >
                    <circle cx={x} cy={y} r="14" fill="url(#peerHalo)" className="myzel-halo" />
                    <circle cx={x} cy={y} r="7.5" fill={PALETTE.accent} stroke={PALETTE.cream} strokeOpacity="0.7" strokeWidth="1" />
                  </g>
                );
                continue;
              }

              // Nodo ilustrativo (solo Grado 1, cuando aún no hay red real)
              if (isPreviewGrade && previewMap.has(slot)) {
                const { entropy } = previewMap.get(slot);
                elements.push(
                  <g
                    key={`preview-${grade}-${slot}`}
                    className="cursor-pointer"
                    role="button"
                    tabIndex={0}
                    aria-label={entropy ? 'Nodo ilustrativo en entropía' : 'Nodo ilustrativo activo'}
                    onClick={() => setSelected({ kind: 'preview', grade, entropy })}
                    onKeyDown={(e) => e.key === 'Enter' && setSelected({ kind: 'preview', grade, entropy })}
                  >
                    {entropy ? (
                      <>
                        <circle cx={x} cy={y} r="11" fill="url(#entropyNode)" fillOpacity="0.55" stroke={PALETTE.cream} strokeOpacity="0.25" strokeWidth="1" strokeDasharray="3 3" />
                        <circle cx={x} cy={y} r="3" fill={PALETTE.muted} fillOpacity="0.9" />
                      </>
                    ) : (
                      <>
                        <circle cx={x} cy={y} r="15" fill="url(#peerHalo)" className="myzel-halo" />
                        <circle cx={x} cy={y} r="8" fill={PALETTE.accent} stroke={PALETTE.cream} strokeOpacity="0.6" strokeWidth="1" strokeDasharray="2.5 2.5" />
                      </>
                    )}
                  </g>
                );
                continue;
              }

              // Hueco disponible (score) en grado abierto
              elements.push(
                <g
                  key={`socket-${grade}-${slot}`}
                  className="cursor-pointer"
                  role="button"
                  tabIndex={0}
                  aria-label={`Hueco disponible en Grado ${grade}`}
                  onClick={() => setSelected({ kind: 'socket', grade, index: slot + 1 })}
                  onKeyDown={(e) => e.key === 'Enter' && setSelected({ kind: 'socket', grade, index: slot + 1 })}
                >
                  <circle cx={x} cy={y} r="7.5" fill="none" stroke={PALETTE.accent} strokeOpacity="0.22" strokeWidth="1.2" strokeDasharray="3 4" />
                  <path d={`M ${x - 3} ${y} H ${x + 3} M ${x} ${y - 3} V ${y + 3}`} stroke={PALETTE.accent} strokeOpacity="0.3" strokeWidth="1.1" strokeLinecap="round" />
                </g>
              );
            }

            return <g key={`nodes-${grade}`}>{elements}</g>;
          })}

          {/* Candados de grados bloqueados (Grados 2-4) */}
          {RING_RADII.map((radius, i) => {
            const grade = i + 1;
            if (unlockedByGrade[grade]?.unlocked) return null;
            const { x, y } = polarToCartesian(CX, CY, radius, -90);
            return (
              <g
                key={`lock-${grade}`}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={`Grado ${grade} bloqueado. Pulsa para ver cómo abrirlo.`}
                onClick={() => setUnlockTarget(grade)}
                onKeyDown={(e) => e.key === 'Enter' && setUnlockTarget(grade)}
              >
                <circle cx={x} cy={y} r="17" fill={PALETTE.bg} stroke={PALETTE.accent} strokeOpacity="0.65" strokeWidth="1.4" />
                <g transform={`translate(${x - 7}, ${y - 6}) scale(0.585)`} stroke={PALETTE.accent} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="11" width="16" height="9" rx="2" fill={PALETTE.deep} stroke={PALETTE.accent} />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </g>
              </g>
            );
          })}

          {/* Nodo central: TÚ */}
          <g aria-label="Tu nodo">
            <circle cx={CX} cy={CY} r={72 * lum + 34} fill="url(#youHalo)" opacity={haloOpacity} className="myzel-halo" filter="url(#nodeBlur)" />
            <circle cx={CX} cy={CY} r="26" fill="url(#youCore)" stroke={PALETTE.cream} strokeOpacity="0.85" strokeWidth="1.6" />
            {/* Brote */}
            <g transform={`translate(${CX - 9}, ${CY - 10}) scale(0.75)`} stroke={PALETTE.cream} strokeWidth="1.9" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22V11" />
              <path d="M12 13C12 8 8 5 3 5c0 6 4 9 9 8" />
              <path d="M12 11c0-5 4-8 9-8 0 6-4 9-9 8" />
            </g>
            <circle cx={CX + 17} cy={CY - 17} r="6.5" fill={PALETTE.bg} stroke={PALETTE.accent} strokeWidth="1.2" />
            <circle cx={CX + 17} cy={CY - 17} r="3" fill={PALETTE.accent} />
            <text
              x={CX}
              y={CY + 44}
              textAnchor="middle"
              fontSize="12"
              fontWeight="800"
              fill={PALETTE.cream}
              letterSpacing="3"
            >
              TÚ
            </text>
          </g>
        </svg>
      </div>

      {/* Leyenda + panel de detalle */}
      <div className="px-5 pb-5 pt-1 space-y-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]" style={{ color: PALETTE.muted }}>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: PALETTE.accent, boxShadow: `0 0 6px ${PALETTE.accent}` }} />
            {t('myzel_graph.legend_active', 'Nodo activo (halo)')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-dashed" style={{ background: `${PALETTE.muted}55`, borderColor: PALETTE.muted }} />
            {t('myzel_graph.legend_entropy', 'Entropía (−10%/mes · suelo 20%)')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Lock size={11} strokeWidth={2.5} />
            {t('myzel_graph.legend_locked', 'Grado bloqueado (2–4)')}
          </span>
          {communityXp > 0 && (
            <span className="inline-flex items-center gap-1.5" style={{ color: PALETTE.cream }}>
              {t('myzel_graph.xp_community', 'XP Community')}: {Math.round(communityXp)}
            </span>
          )}
        </div>

        <div
          className="min-h-[44px] rounded-xl border px-4 py-2.5 text-xs flex items-center gap-2"
          style={{ borderColor: `${PALETTE.deep}aa`, background: `${PALETTE.deep}2e`, color: PALETTE.cream }}
          aria-live="polite"
        >
          {selected?.kind === 'real' && (
            <span>{t('myzel_graph.detail_real', 'Contacto {{index}} enlazado en el Grado {{grade}}. Su actividad impulsa tu cosecha y la tuya nutre sus grados (50/25/12,5/6,25/6,25).', { index: selected.index, grade: selected.grade })}</span>
          )}
          {selected?.kind === 'preview' && !selected.entropy && (
            <span>{t('myzel_graph.detail_preview', 'Nodo ilustrativo con halo. Así brillará tu red real cuando enlaces a tu primer invitado: pulsos que viajan 4 grados.')}</span>
          )}
          {selected?.kind === 'preview' && selected.entropy && (
            <span>{t('myzel_graph.detail_entropy', 'Nodo en entropía: atenuado por más de 30 días sin actividad (−10%/mes, suelo 20%). Completar una misión o contratar un plan lo cura al 100%.')}</span>
          )}
          {selected?.kind === 'socket' && (
            <span>{t('myzel_graph.detail_socket', 'Hueco disponible en el Grado {{grade}}. Invita a un amigo: cuando se registre, su nodo enraíza aquí y tú recibes +25 P.', { grade: selected.grade })}</span>
          )}
          {!selected && (
            <span style={{ color: PALETTE.muted }}>{t('myzel_graph.detail_hint', 'Pulsa un nodo para explorar, o un candado para abrir tu micelio completo.')}</span>
          )}
          {selected && (
            <button onClick={() => setSelected(null)} className="ml-auto p-1 rounded hover:bg-white/5" aria-label="Cerrar detalle">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Modal: cómo abrir Grados 2-4 */}
      <Dialog open={unlockTarget !== null} onOpenChange={(open) => !open && setUnlockTarget(null)}>
        <DialogContent className="max-w-md" style={{ background: PALETTE.bg, borderColor: PALETTE.deep, color: PALETTE.cream }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: PALETTE.cream }}>
              <Lock size={18} style={{ color: PALETTE.accent }} />
              {t('myzel_graph.unlock_title', 'Grado {{grade}} bloqueado', { grade: unlockTarget })}
            </DialogTitle>
            <DialogDescription style={{ color: PALETTE.muted }}>
              {t('myzel_graph.unlock_desc', 'Tu red de 4 grados está tejida, pero los grados superiores solo recepcionan impulsos si los abres.')}
            </DialogDescription>
          </DialogHeader>

          <ul className="text-sm space-y-3" style={{ color: PALETTE.cream }}>
            <li className="flex items-start gap-2">
              <Sprout size={16} className="mt-0.5 shrink-0" style={{ color: PALETTE.accent }} />
              <span>
                {t('myzel_graph.unlock_plan', 'Suscripción activa {{plan}} abre hasta el Grado {{grade}} (Explorador/a = Grado 1 · Guardián/a = Grado 2 · Campeón/a = Grado 3 · Paladín/a = Grado 4).', { plan: unlockViaDetail?.plan ?? '', grade: unlockTarget })}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Sprout size={16} className="mt-0.5 shrink-0" style={{ color: PALETTE.accent }} />
              <span>
                {t('myzel_graph.unlock_points', 'O abre tus Grados con tu Nivel Community + puntos (Freischaltung vía senke LIFO). Los puntos más recientes se consumen primero.')}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Sprout size={16} className="mt-0.5 shrink-0" style={{ color: PALETTE.muted }} />
              <span style={{ color: PALETTE.muted }}>
                {t('myzel_graph.unlock_zero_waste', 'Mientras un grado esté cerrado, los impulsos dirigidos a él regresan íntegros al fondo comunitario (Zero-Waste-Loop).')}
              </span>
            </li>
          </ul>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => navigate('/dashboard/subscription')} className="border-white/15 text-inherit hover:bg-white/10">
              {t('myzel_graph.unlock_cta_plan', 'Ver mi suscripción')}
            </Button>
            <Button disabled className="opacity-70" title={t('myzel_graph.unlock_cta_points_soon', 'Disponible en la próxima fase')}>
              {t('myzel_graph.unlock_cta_points', 'Abrir con puntos — próximamente')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
