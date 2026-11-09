import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useFinancial } from '@/contexts/FinancialContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Camera, CheckCircle, UserPlus, Leaf, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LandDollarQRScanner = ({ onClose }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const { refreshFinancials, landDollar } = useFinancial();

  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  // Si el usuario ya tiene un Land Dollar, mostrar notificación
  const hasLandDollar = profile?.land_dollar || profile?.hasLandDollar || landDollar;

  const simulateQRScan = () => {
    setIsScanning(true);
    setError(null);
  };

  const processLandDollarQR = async () => {
    if (!scanResult || !user?.id) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Validar que el usuario esté registrado como user_basic si no tiene suscripción activa
      const currentRole = profile?.role || 'user';
      const isPremiumActive = profile?.role === 'user_premium' || profile?.role === 'admin';

      // Si no es premium/admin, asignar rol user_basic (Explorador) si es legacy
      if (currentRole === 'user' && !isPremiumActive) {
        // En una implementación real, esto actualizaría la tabla profiles
        // await supabase
        //   .from('profiles')
        //   .update({ role: 'user_basic' })
        //   .eq('id', user.id);
      }

      // Otorgar al usuario sus primeros 100 puntos inmaduros (1 dm²) etiquetados como SELF_REBATE
      // Esto es el "Efecto de Dotación" (Endowment Effect) - sin barreras de pago

      // Primero, verificar que no tenga ya puntos SELF_REBATE
      const { data: existingSelfRebate } = await supabase
        .from('ic_ledger')
        .select('id')
        .eq('user_id', user.id)
        .eq('tax_origin', 'SELF_REBATE')
        .limit(1);

      if (existingSelfRebate?.length > 0) {
        throw new Error(t('land_dollar_qr.already_has_points', 'Ya tienes puntos SELF_REBATE asignados'));
      }

      // Agregar 100 puntos inmaduros con tax_origin 'SELF_REBATE'
      // 100 puntos = 1 dm² = 1 Acción (Nennwert 0,01€) según la paridad del sistema

      const pointsToGrant = 100; // Puntos
      const pointsAmount = pointsToGrant; // Puntos como unidades

      // Insertar en ic_ledger
      const { error: insertError } = await supabase
        .from('ic_ledger')
        .insert({
          user_id: user.id,
          amount: pointsAmount,
          source: 'land_dollar_onboarding',
          metadata: {
            onboarding: true,
            land_dollar_qr_scanned: true,
            type: 'endowment_effect'
          },
          created_at: new Date().toISOString(),
          tax_origin: 'SELF_REBATE' // Libres de impuestos al 100%
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error adding endowment points:', insertError);
        throw insertError;
      }

      // También actualizar impact_credits si es necesario
      const { data: existingCredits } = await supabase
        .from('impact_credits')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      const currentBalance = existingCredits?.balance || 0;
      const newBalance = currentBalance + pointsAmount;

      await supabase
        .from('impact_credits')
        .upsert({
          user_id: user.id,
          balance: newBalance,
          updated_at: new Date().toISOString()
        });

      // Regenerar Land Dollar si no existe
      if (!hasLandDollar) {
        // Migración 15: tabla land_dollars -> land_dollar_tokens (PK = short_code)
        // user_id -> first_claimed_by_user_id | qr_code_url / land_dollar_url eliminadas
        const scannedCode = typeof scanResult === 'string'
          ? scanResult.split('/').filter(Boolean).pop()
          : null;
        const shortCode = scannedCode
          || `${user.id.substring(0, 6).toUpperCase()}${Date.now().toString(36).toUpperCase()}`;

        const { error: ldError } = await supabase
          .from('land_dollar_tokens')
          .insert({
            short_code: shortCode,
            first_claimed_by_user_id: user.id,
            status: 'active',
            is_active: true,
            notes: 'Onboarding QR - endowment effect (SELF_REBATE)',
            created_at: new Date().toISOString()
          });

        if (ldError) {
          console.error('Error creating Land Dollar token:', ldError);
          throw ldError;
        }
      }

      toast({
        title: t('land_dollar_qr.success.title', '¡Bienvenido al ecosistema!'),
        description: t('land_dollar_qr.success.description', `Has recibido ${pointsAmount} puntos inmaduros (1 dm²) libres de impuestos. ¡Ahora puedes explorar misiones y ganar más!`), 
        className: "bg-emerald-50 border-emerald-200"
      });

      // Refrescar datos financieros para actualizar los valores
      await refreshFinancials();

      // Cerrar modal después de un breve delay
      setTimeout(() => {
        if (onClose) onClose();
      }, 1500);

    } catch (error) {
      console.error('Error procesando QR de Land Dollar:', error);
      setError(error.message);
      toast({
        variant: "destructive",
        title: t('land_dollar_qr.error.title', 'Error'),
        description: error.message || t('land_dollar_qr.error.default', 'Ocurrió un error al procesar el QR'),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (hasLandDollar) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">
          {t('land_dollar_qr.already_activated.title', '¡Ya tienes un Land Dollar!')}
        </h3>
        <p className="text-muted-foreground mb-6">
          {t('land_dollar_qr.already_activated.description', 'Tu cuenta ya tiene un Land Dollar activo con puntos asignados.')}
        </p>
        <Button onClick={onClose}>
          {t('common.close', 'Cerrar')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserPlus className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-xl font-bold mb-2">
          {t('land_dollar_qr.title', 'Onboarding Land Dollar')}
        </h3>
        <p className="text-muted-foreground">
          {t('land_dollar_qr.description', 'Escanea un QR de Land Dollar físico para unirte al ecosistema. Recibirás 100 puntos inmaduros (1 dm²) libres de impuestos automáticamente.')}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!scanResult ? (
          <motion.div
            key="scan"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="border-2 border-dashed border-emerald-300 rounded-lg p-8 text-center hover:border-emerald-400 transition-colors cursor-pointer"
                 onClick={() => simulateQRScan()}
            >
              <Camera className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <p className="text-emerald-600 font-medium mb-2">
                {t('land_dollar_qr.scan_instruction', 'Haz clic para simular escaneo de QR')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('land_dollar_qr.simulated', '(Escaneo simulado para demo)')
              }</p>
            </div>

            {isScanning && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 text-center"
              >
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
                <p className="text-emerald-700 font-medium">
                  {t('land_dollar_qr.scanning', 'Escaneando QR...')}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('land_dollar_qr.simulating', 'Simulando lectura de QR de Land Dollar...')}
                </p>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
              <h4 className="font-medium text-emerald-800 mb-2">
                {t('land_dollar_qr.scan_result.title', 'QR Escaneado con éxito')}
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                {t('land_dollar_qr.scan_result.description', `Código: ${scanResult.substring(0, 20)}...`)}
              </p>

              <div className="bg-white border border-emerald-300 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Leaf className="w-5 h-5 text-emerald-600" />
                  <span className="font-bold text-emerald-800">+100 puntos inmaduros</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Coins className="w-5 h-5 text-amber-600" />
                  <span className="font-bold text-amber-800">1 dm² (Land Dollar)</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                {t('land_dollar_qr.scan_result.tax_status', 'Etiquetado como SELF_REBATE (100% libre de impuestos)')}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <p className="text-red-700 text-sm font-medium">Error: {error}</p>
              </div>
            )}

            <Button
              onClick={processLandDollarQR}
              disabled={isProcessing}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {isProcessing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('land_dollar_qr.processing', 'Procesando...')}</>
              ) : (
                <>{t('land_dollar_qr.activate_now', 'Activar Land Dollar y Recibir Puntos')}</>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setScanResult(null);
                setIsScanning(false);
                setError(null);
              }}
              className="w-full"
            >
              {t('land_dollar_qr.scan_another', 'Escanear otro QR')}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LandDollarQRScanner;