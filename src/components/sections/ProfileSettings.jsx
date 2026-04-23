import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useFinancial } from '@/contexts/FinancialContext'; 
import { executeGamificationAction } from '@/utils/gamificationEngine'; 
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Loader2, User, Save, Sparkles, MapPin, Phone, Mail, Camera, Upload } from 'lucide-react';
//import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { getInvestorProfileBySlug } from '@/constants/investorProfiles';

const ProfileSettings = () => {
    const { t } = useTranslation();
    const { profile, user, fetchProfile } = useAuth();
    const { refreshFinancials } = useFinancial(); 
    const { toast } = useToast();
    //const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState('');
    
    const [rewardClaimed, setRewardClaimed] = useState(false);

    const [formData, setFormData] = useState({
        full_name: '',
        bio: '',
        email: '', 
        phone: '',
        city: '',
        country: ''
    });

    useEffect(() => {
        if (profile) {
            setFormData({
                full_name: profile.name || profile.full_name || '', 
                bio: profile.bio || '',
                email: profile.email || user?.email || '',
                phone: profile.phone || '',
                city: profile.city || '',
                country: profile.country || ''
            });

            setAvatarPreview(profile.avatar_url || '');
        }
    }, [profile, user]);

    useEffect(() => {
        if (user?.id) {
            const checkRewardStatus = async () => {
                const { data } = await supabase
                    .from('gamification_history')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('action_type', 'Profile')
                    .limit(1)
                    .maybeSingle();

                if (data) {
                    setRewardClaimed(true);
                }
            };
            checkRewardStatus();
        }
    }, [user?.id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                toast({ 
                    variant: "destructive", 
                    title: t('common.error'), 
                    description: "Image must be less than 5MB." 
                });
                return;
            }
            if (!file.type.startsWith('image/')) {
                toast({ 
                    variant: "destructive", 
                    title: t('common.error'), 
                    description: "File must be a valid image." 
                });
                return;
            }

            setAvatarFile(file);
            const objectUrl = URL.createObjectURL(file);
            setAvatarPreview(objectUrl);
        }
    };

    const getInitials = (name) => {
        return name ? name.substring(0, 2).toUpperCase() : 'US';
    };

    const uploadAvatar = async (file) => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            return data.publicUrl;
        } catch (error) {
            console.error('Error uploading avatar:', error);
            throw error;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);
        
        try {
            let finalAvatarUrl = avatarPreview;

            if (avatarFile) {
                finalAvatarUrl = await uploadAvatar(avatarFile);
            }

            const updates = {
                name: formData.full_name, 
                avatar_url: finalAvatarUrl, 
                bio: formData.bio,
                phone: formData.phone,
                city: formData.city,
                country: formData.country,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);

            if (error) throw error;

            await fetchProfile(user.id);

            const result = await executeGamificationAction(
                user.id, 
                'profile', 
                { notes: 'Profile details updated via settings page' }
            );

            if (result.success) {
                setRewardClaimed(true); 
                await refreshFinancials(); 
                toast({
                    title: t('common.success'), 
                    description: `Profile updated! You earned +${result.creditsAwarded} Bonus Points.`, 
                    className: "bg-card text-card-foreground border-gold/30"
                });
            } else {
                toast({
                    title: t('common.success'),
                    description: t('profile.toasts.success_desc', 'Profile updated successfully.'),
                    className: "bg-card text-card-foreground border-gold/30"
                });
            }

        } catch (err) {
            console.error(err);
            toast({ variant: "destructive", title: t('common.error'), description: err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full pb-20">

            {/* HERO BANNER */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="relative w-full bg-card pb-32 pt-10 px-6 rounded-3xl shadow-lg border border-gold/30 mb-[-5rem] overflow-hidden"
            >
                <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-40 w-40 rounded-full bg-white/5 blur-2xl pointer-events-none" />

                <div className="relative z-10 max-w-7xl mx-auto">
                    <div className="flex flex-col gap-2">
                        {/*<Button
                            variant="ghost"
                            size="sm"
                            className="w-fit text-card-foreground/70 hover:text-gold hover:bg-white/10 mb-2 pl-0 transition-colors"
                            onClick={() => navigate(-1)}
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" /> {t('common.back', 'Back')}
                        </Button> */}

                        <div className="flex items-center gap-3">
                            <Badge className="bg-gradient-gold text-[#063127] border-none px-2 py-0.5 font-black text-xs shadow-glow">
                                {t('navigation.settings', 'Settings')}
                            </Badge>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight drop-shadow-md">
                            {t('profile.title', 'Profile Settings')}
                        </h1>
                    </div>
                </div>
            </motion.div>

            {/* TARJETA PRINCIPAL */}
            <div className="max-w-7xl mx-auto px-2 relative z-20">
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="bg-card shadow-2xl border border-gold/20 rounded-2xl overflow-hidden min-h-[500px]">

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-0">

                            {/* COLUMNA IZQUIERDA (FOTO Y RESUMEN) */}
                            <div className="md:col-span-5 lg:col-span-4 bg-black/20 p-8 flex flex-col items-center text-center border-b md:border-b-0 md:border-r border-gold/10 rounded-2xl md:rounded-r-none">
                                
                                {/* COMPONENTE DE SUBIDA DE FOTO */}
                                <div className="relative group mt-4">
                                    <div className="absolute -inset-1 bg-gradient-gold rounded-full blur opacity-30 group-hover:opacity-60 transition duration-500 shadow-glow"></div>
                                    
                                    <label htmlFor="avatar-upload" className="cursor-pointer block relative">
                                        <Avatar className="w-40 h-40 border-[6px] border-card shadow-xl bg-white transition-transform group-hover:scale-105">
                                            <AvatarImage src={avatarPreview} className="object-cover" />
                                            <AvatarFallback className="bg-muted text-muted-foreground text-5xl font-bold">
                                                {getInitials(formData.full_name)}
                                            </AvatarFallback>
                                        </Avatar>

                                        <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <Camera className="w-10 h-10 text-white drop-shadow-md" />
                                        </div>

                                        <div className="absolute bottom-2 right-2 bg-gradient-gold text-[#063127] p-2.5 rounded-full shadow-glow border-2 border-card hover:scale-110 transition-transform">
                                            <Upload className="w-4 h-4" />
                                        </div>
                                    </label>
                                    
                                    {/* Input oculto */}
                                    <input 
                                        id="avatar-upload" 
                                        type="file" 
                                        accept="image/*" 
                                        className="hidden" 
                                        onChange={handleImageChange}
                                        disabled={loading}
                                    />
                                </div>

                                <p className="text-xs text-card-foreground/60 mt-4 font-medium">
                                    {t('profile.change_image_hint', 'Click image to change (Max 5MB)')}
                                </p>

                                <h2 className="text-xl font-bold text-card-foreground mt-6 mb-1">
                                    {formData.full_name || t('profile.placeholders.name', 'Your Name')}
                                </h2>
                                <p className="text-card-foreground/70 text-sm mb-6 flex items-center justify-center gap-1">
                                    <Mail className="w-3 h-3" /> {formData.email}
                                </p>

                                <div className="flex flex-wrap gap-2 justify-center mb-8">
                                    <Badge variant="secondary" className="bg-white/10 text-card-foreground border-white/20 capitalize">
                                        {profile?.role?.replace('_', ' ') || 'User'}
                                    </Badge>
                                    {profile?.genesis_profile && (() => {
                                        const slug = profile.genesis_profile.toLowerCase();
                                        const pData = getInvestorProfileBySlug(slug);
                                        const label = t(`genesisQuest.profiles.genesis.${slug}.title`, pData?.title || `${profile.genesis_profile} Profile`);
                                        
                                        return (
                                            <Badge className="bg-gold/10 text-gold border border-gold/30 capitalize">
                                                {label}
                                            </Badge>
                                        );
                                    })()}
                                </div>

                                {/* CONDICIONAL DEL PREMIO (Se oculta si ya fue reclamado) */}
                                {!rewardClaimed && (
                                    <div className="mt-auto w-full bg-gold/5 border border-gold/20 rounded-xl p-4 text-left shadow-inner">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Sparkles className="w-4 h-4 text-gold" />
                                            <span className="text-xs font-bold text-gold uppercase tracking-wide">
                                                {t('profile.gamification_card.tip_label', 'Reward')}
                                            </span>
                                        </div>
                                        <p className="text-xs text-card-foreground/80 leading-relaxed">
                                            {t('profile.gamification_card.reward_text', 'Update your profile details to earn bonus credits.')}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* COLUMNA DERECHA: FORMULARIO */}
                            <div className="md:col-span-7 lg:col-span-8 p-8 md:p-12 bg-card">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-xl font-bold text-card-foreground flex items-center gap-2">
                                        <User className="w-5 h-5 text-gold" />
                                        {t('profile.edit_details', 'Edit Details')}
                                    </h3>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    
                                    {/* 1. INFORMACIÓN PERSONAL */}
                                    <div className="grid gap-6 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-card-foreground">
                                                {t('profile.labels.full_name', 'Full Name')} <span className="text-red-500">*</span>
                                            </label>
                                            <Input
                                                name="full_name"
                                                value={formData.full_name}
                                                onChange={handleChange}
                                                className="h-11 bg-background text-foreground focus-visible:ring-gold focus-visible:border-gold border-white/20"
                                                placeholder={t('profile.placeholders.name', 'Your Name')}
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-card-foreground">
                                                {t('profile.labels.phone', 'Phone Number')}
                                            </label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    name="phone"
                                                    value={formData.phone}
                                                    onChange={handleChange}
                                                    className="h-11 pl-10 bg-background text-foreground focus-visible:ring-gold focus-visible:border-gold border-white/20"
                                                    placeholder={t('profile.placeholders.phone', '+1 234 567 890')}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. UBICACIÓN */}
                                    <div className="grid gap-6 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-card-foreground">
                                                {t('profile.labels.city', 'City')}
                                            </label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    name="city"
                                                    value={formData.city}
                                                    onChange={handleChange}
                                                    className="h-11 pl-10 bg-background text-foreground focus-visible:ring-gold focus-visible:border-gold border-white/20"
                                                    placeholder={t('profile.placeholders.city', 'e.g. Berlin')}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-card-foreground">
                                                {t('profile.labels.country', 'Country')}
                                            </label>
                                            <Input
                                                name="country"
                                                value={formData.country}
                                                onChange={handleChange}
                                                className="h-11 bg-background text-foreground focus-visible:ring-gold focus-visible:border-gold border-white/20"
                                                placeholder={t('profile.placeholders.country', 'e.g. Germany')}
                                            />
                                        </div>
                                    </div>

                                    {/* 3. BIOGRAFÍA */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-card-foreground">
                                            {t('profile.labels.bio', 'Bio')}
                                        </label>
                                        <Textarea
                                            name="bio"
                                            value={formData.bio}
                                            onChange={handleChange}
                                            className="resize-none min-h-[100px] bg-background text-foreground p-4 leading-relaxed border-white/20 focus-visible:ring-gold focus-visible:border-gold"
                                            placeholder={t('profile.placeholders.bio', 'Tell us about yourself...')}
                                            maxLength={500}
                                        />
                                        <div className="flex justify-end">
                                            <span className="text-xs text-card-foreground/50 font-medium">
                                                {formData.bio.length}/500 {t('profile.character_count', 'characters')}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-4 border-t border-gold/10">
                                        <Button
                                            type="submit"
                                            disabled={loading}
                                            className="px-8 h-12 text-base font-black bg-gradient-gold text-white shadow-glow hover:scale-105 hover:opacity-90 transition-all rounded-xl border-none"
                                        >
                                            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                                            {loading ? t('profile.buttons.saving', 'Saving...') : t('profile.buttons.save', 'Save Changes')}
                                        </Button>
                                    </div>
                                </form>
                            </div>

                        </div>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
};

export default ProfileSettings;