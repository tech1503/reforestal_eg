import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { generateLandDollarWithQR } from '@/utils/landDollarQRRenderer';
import { getSupportLevelByAmount, getVariantDetails } from '@/utils/tierLogicUtils';

export const useContributionForm = (tiers, onSuccess) => {
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Form Data
    const [userMode, setUserMode] = useState('manual');
    const [formData, setFormData] = useState({
        user_id: '',
        contribution_amount: '',
        contribution_date: new Date().toISOString().split('T')[0],
        notes: '',
        manual_name: '',
        manual_email: '',
        manual_phone: '',
        manual_city: '',
        manual_country: ''
    });

    const [computedTier, setComputedTier] = useState(null);

    useEffect(() => {
        const calculate = async () => {
            const amount = parseFloat(formData.contribution_amount);
            if (!amount || isNaN(amount)) {
                setComputedTier(null);
                return;
            }

            const levelId = await getSupportLevelByAmount(amount);
            
            if (levelId) {
                const foundInProps = tiers.find(t => t.id === levelId);
                
                if (foundInProps) {
                    setComputedTier(foundInProps);
                } else {
                    const details = await getVariantDetails(levelId, 'en');
                    if (details) {
                        setComputedTier({
                            id: levelId,
                            name: details.variant_title,
                            min_amount: details.min_amount,
                            slug: details.slug,
                            description: details.variant_description,
                            benefits: [] 
                        });
                    }
                }
            } else {
                setComputedTier(null);
            }
        };
        
        const timer = setTimeout(calculate, 300);
        return () => clearTimeout(timer);
    }, [formData.contribution_amount, tiers]);

    const selectedTier = computedTier;

    const submitContribution = async () => {
        setIsProcessing(true);
        try {
            if (!selectedTier) throw new Error("Amount too low (Min €5.00) or no matching tier found.");

            let finalUserId = formData.user_id || null;
            let finalImportedUserId = null;
            let snxId = null;

            if (userMode === 'manual') {
                if (!formData.manual_email || !formData.manual_name) throw new Error("Name and Email required.");

                const { data: existing } = await supabase
                    .from('startnext_imported_users')
                    .select('id, snx_id')
                    .eq('email', formData.manual_email)
                    .maybeSingle();

                if (existing) {
                    finalImportedUserId = existing.id;
                    snxId = existing.snx_id;
                } else {
                    const { data: newImport, error: impError } = await supabase
                        .from('startnext_imported_users')
                        .insert({
                            email: formData.manual_email,
                            full_name: formData.manual_name,
                            city: formData.manual_city,
                            country: formData.manual_country,
                            snx_id: `SNX-${Date.now().toString().slice(-6)}`
                        })
                        .select()
                        .single();
                    if (impError) throw impError;
                    finalImportedUserId = newImport.id;
                    snxId = newImport.snx_id;
                }
            } else {
                if (!formData.user_id) throw new Error("Select a user.");
                finalUserId = formData.user_id;
                snxId = `SNX-EXT-${Date.now().toString().slice(-6)}`;
            }

            // 2. Generate Assets
            const linkRef = crypto.randomUUID();
            let landDollarUrl = null;
            try {
                const blob = await generateLandDollarWithQR(linkRef);
                const fileName = `land-dollars/${finalUserId || 'guest'}/${linkRef}.png`;
                const { error: upError } = await supabase.storage.from('land-dollars').upload(fileName, blob);
                if (!upError) {
                    const { data } = supabase.storage.from('land-dollars').getPublicUrl(fileName);
                    landDollarUrl = data.publicUrl;
                }
            } catch (e) {
                console.warn("Asset generation skipped:", e);
            }

            // 3. Insert Contribution
            const { data: contrib, error: cError } = await supabase.from('startnext_contributions').insert({
                user_id: finalUserId,
                imported_user_id: finalImportedUserId,
                contribution_amount: parseFloat(formData.contribution_amount),
                contribution_date: formData.contribution_date,
                new_support_level_id: selectedTier.id,
                benefit_assigned: true,
                notes: formData.notes,
                phone: formData.manual_phone,
                city: formData.manual_city,
                country: formData.manual_country,
                land_dollar_image_url: landDollarUrl
            }).select().single();

            if (cError) throw cError;

            const icReward = selectedTier.impact_credits_reward || (selectedTier.min_amount * 100); 
            const ldReward = selectedTier.land_dollars_reward || selectedTier.min_amount;

            if (finalUserId) {
                await Promise.all([
                    supabase.from('impact_credits').insert({
                        user_id: finalUserId,
                        amount: icReward,
                        source: 'startnext',
                        description: `Tier Reward: ${selectedTier.name || selectedTier.slug}`,
                        related_support_level_id: selectedTier.id,
                        contribution_id: contrib.id
                    }),
                    supabase.from('land_dollars').insert({
                        user_id: finalUserId,
                        amount: ldReward,
                        land_dollar_url: landDollarUrl,
                        link_ref: linkRef,
                        qr_code_url: `https://reforest.al/${linkRef}`,
                        status: 'issued',
                        related_support_level_id: selectedTier.id,
                        contribution_id: contrib.id
                    }),
                    supabase.from('user_benefits').insert({
                        user_id: finalUserId,
                        new_support_level_id: selectedTier.id,
                        contribution_id: contrib.id,
                        assigned_date: new Date().toISOString(),
                        status: 'active',
                        benefit_level_id: '00000000-0000-0000-0000-000000000000'
                    })
                ]);
            }

            toast({ title: "Success", description: "Contribution processed successfully." });
            onSuccess?.();
            setFormData(prev => ({ ...prev, contribution_amount: '', notes: '' }));
            setComputedTier(null);
        } catch (err) {
            console.error(err);
            toast({ variant: "destructive", title: "Error", description: err.message });
        } finally {
            setIsProcessing(false);
        }
    };

    return {
        formData,
        setFormData,
        userMode,
        setUserMode,
        selectedTier, 
        submitContribution,
        isProcessing
    };
};