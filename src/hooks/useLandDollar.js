import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { generateLandDollarWithQR, downloadLandDollar } from '@/utils/landDollarGenerator';

export const useLandDollar = (userId, profile) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [landDollar, setLandDollar] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkAndGenerate = async () => {
      if (!userId || profile?.role === 'admin') {
        if (mounted) {
          setLoading(false);
          setIsReady(true);
        }
        return;
      }

      try {
        const { data: existing, error: fetchError } = await supabase
          .from('land_dollar_tokens')
          .select('*')
          .eq('first_claimed_by_user_id', userId)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (existing) {
          if (mounted) setLandDollar(existing);
        } else {
          console.log('No Land Dollar found. Generating new asset...');
          
          const shortCode = profile?.referral_code || `${userId.substring(0, 8)}-${Date.now()}`;
          await generateAndSave(shortCode, null);
        }
      } catch (err) {
        console.error('LandDollar check error:', err);
        if (mounted) setError(err.message);
      } finally {
        if (mounted) {
          setLoading(false);
          setIsReady(true);
        }
      }
    };

    checkAndGenerate();

    return () => { mounted = false; };
  }, [userId, profile]);

  const generateAndSave = useCallback(async (shortCode, existingRecord = null) => {
    try {
      setLoading(true);
      const pngDataUrl = await generateLandDollarWithQR(shortCode);
      
      const res = await fetch(pngDataUrl);
      const blob = await res.blob();
      const file = new File([blob], `ld_${shortCode}.png`, { type: 'image/png' });

      const filePath = `${userId}/land_dollar_${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
         .from('land-dollars')
         .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Migración 15: tabla renombrada + PK short_code + columna owner renombrada.
      // qr_code_url / land_dollar_url fueron eliminadas del esquema.
      const payload = {
        short_code: shortCode,
        first_claimed_by_user_id: userId,
        is_active: true,
        status: 'issued'
      };

      const { data: newRecord, error: dbError } = existingRecord?.short_code
        ? await supabase
            .from('land_dollar_tokens')
            .update(payload)
            .eq('short_code', existingRecord.short_code)
            .select()
            .single()
        : await supabase
            .from('land_dollar_tokens')
            .insert(payload)
            .select()
            .single();

      if (dbError) throw dbError;

      setLandDollar(newRecord);
      return newRecord;
    } catch (err) {
      console.error("Error saving Land Dollar:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const regenerateQR = async () => {
    if (!landDollar || !userId) return;
    try {
      setError(null);
      const newShortCode = profile?.referral_code || `${userId.substring(0, 8)}-${Date.now()}`;
      await generateAndSave(newShortCode, landDollar);
    } catch (err) {
      console.error('Regeneration error:', err);
      setError(err.message);
    }
  };

  const handleDownload = async () => {
    if (!landDollar?.short_code) return;
    try {
      // Regeneramos localmente: la BD ya no persiste land_dollar_url / qr_code_url
      const dataUrl = await generateLandDollarWithQR(landDollar.short_code);
      downloadLandDollar(dataUrl, `LandDollar_${landDollar.short_code}.png`);
    } catch (err) {
      console.error('LandDollar download error:', err);
      setError(err.message);
    }
  };

  return { 
    landDollar, 
    loading, 
    error, 
    isReady,
    regenerateQR, 
    handleDownload 
  };
};
