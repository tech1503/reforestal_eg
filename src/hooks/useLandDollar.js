import { useState, useEffect } from 'react';
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
          .from('land_dollars')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (existing) {
          if (mounted) setLandDollar(existing);
        } else {
          console.log('No Land Dollar found. Generating new asset...');
          
          const linkRef = profile?.referral_code || `${userId.substring(0, 8)}-${Date.now()}`;
          await generateAndSave(linkRef);
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

  const generateAndSave = async (link_ref) => {
    try {
      setLoading(true);
      const pngDataUrl = await generateLandDollarWithQR(link_ref);
      
      const res = await fetch(pngDataUrl);
      const blob = await res.blob();
      const file = new File([blob], `ld_${link_ref}.png`, { type: 'image/png' });

      const filePath = `${userId}/land_dollar_${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
         .from('land-dollars')
         .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
         .from('land-dollars')
         .getPublicUrl(filePath);

      const { data: newRecord, error: dbError } = await supabase
        .from('land_dollars')
        .upsert({ 
            user_id: userId, 
            link_ref: link_ref, 
            qr_code_url: publicUrl, 
            land_dollar_url: publicUrl,
            is_active: true,
            status: 'issued',
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })
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
  };

  const regenerateQR = async () => {
    if (!landDollar || !userId) return;
    try {
      setError(null);
      const newRef = profile?.referral_code || `${userId.substring(0, 8)}-${Date.now()}`;
      await generateAndSave(newRef);
    } catch (err) {
      console.error('Regeneration error:', err);
      setError(err.message);
    }
  };

  const handleDownload = () => {
    if (landDollar?.land_dollar_url) {
      downloadLandDollar(landDollar.land_dollar_url, `LandDollar_${landDollar.link_ref}.png`);
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
