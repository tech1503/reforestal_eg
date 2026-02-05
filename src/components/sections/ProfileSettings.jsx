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
import { Loader2, ArrowLeft, User, Save, Sparkles, MapPin, Phone, Mail, Camera, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
// IMPORTE NUEVO: Para vincular con la lógica central de perfiles
import { getInvestorProfileBySlug } from '@/constants/investorProfiles';

const ProfileSettings = () => {
    const { t } = useTranslation();
    const { profile, user, fetchProfile } = useAuth();
    const { refreshFinancials } = useFinancial(); 
    const { toast } = useToast();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    
    // Estado para la imagen
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState('');

    // Estado del formulario
    const [formData, setFormData] = useState({
        full_name: '',
        bio: '',
        email: '', 
        phone: '',
        city: '',
        country: ''
    });

    // Cargar datos iniciales
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
            // Establecer la imagen actual como previsualización inicial
            setAvatarPreview(profile.avatar_url || '');
        }
    }, [profile, user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Manejar selección de archivo
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validar tamaño (ej. máx 2MB)
            if (file.size > 2 * 1024 * 1024) {
                toast({ variant: "destructive", title: "Archivo muy grande", description: "La imagen debe pesar menos de 2MB." });
                return;
            }
            setAvatarFile(file);
            // Crear URL temporal para previsualizar
            const objectUrl = URL.createObjectURL(file);
            setAvatarPreview(objectUrl);
        }
    };

    const getInitials = (name) => {
        return name ? name.substring(0, 2).toUpperCase() : 'US';
    };

    // Función auxiliar para subir la imagen a Supabase Storage
    const uploadAvatar = async (file) => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Subir al bucket 'avatars' (ASEGÚRATE DE CREAR ESTE BUCKET EN SUPABASE)
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Obtener URL pública
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

            // 1. Si hay un nuevo archivo seleccionado, subirlo primero
            if (avatarFile) {
                finalAvatarUrl = await uploadAvatar(avatarFile);
            }

            // 2. ACTUALIZAR DATOS EN BASE DE DATOS
            const updates = {
                name: formData.full_name, 
                avatar_url: finalAvatarUrl, // Guardamos la URL generada
                bio: formData.bio,
                phone: formData.phone,
                city: formData.city,
                country: formData.country,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);

            if (error) throw error;

            // Actualizar contexto
            await fetchProfile(user.id);

            // 3. GAMIFICACIÓN
            const result = await executeGamificationAction(
                user.id, 
                'profile', 
                { notes: 'Profile details updated via settings page' }
            );

            if (result.success) {
                await refreshFinancials(); 
                toast({
                    title: "¡Perfil Actualizado!",
                    description: `Has recibido +${result.creditsAwarded} Bonos.`,
                    className: "bg-emerald-600 text-white border-none"
                });
            } else {
                toast({
                    title: t('common.success', 'Success'),
                    description: t('profile.toasts.success_desc', 'Profile updated successfully.'),
                    className: "bg-slate-800 text-white border-none"
                });
            }

        } catch (err) {
            console.error(err);
            toast({ variant: "destructive", title: t('common.error', 'Error'), description: err.message });
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
                className="relative w-full bg-[#107856] pb-32 pt-10 px-6 rounded-3xl shadow-lg mb-[-5rem] overflow-hidden"
            >
                <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-40 w-40 rounded-full bg-emerald-400/10 blur-2xl pointer-events-none" />

                <div className="relative z-10 max-w-7xl mx-auto">
                    <div className="flex flex-col gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-fit text-white/80 hover:text-white hover:bg-white/10 mb-2 pl-0 transition-colors"
                            onClick={() => navigate(-1)}
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" /> {t('common.back', 'Back')}
                        </Button>

                        <div className="flex items-center gap-3">
                            <Badge className="bg-[#FCD34D] text-emerald-900 hover:bg-[#FCD34D] border-0 px-2 py-0.5 font-bold text-xs shadow-sm">
                                {t('navigation.settings', 'Settings')}
                            </Badge>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
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
                    <Card className="bg-white dark:bg-slate-900 shadow-xl border-0 rounded-2xl overflow-hidden min-h-[500px]">

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-0">

                            {/* COLUMNA IZQUIERDA (FOTO Y RESUMEN) */}
                            <div className="md:col-span-5 lg:col-span-4 bg-slate-50 dark:bg-slate-800/30 p-8 flex flex-col items-center text-center border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800">
                                
                                {/* COMPONENTE DE SUBIDA DE FOTO */}
                                <div className="relative group mt-4">
                                    <div className="absolute -inset-1 bg-gradient-to-tr from-emerald-400 to-emerald-600 rounded-full blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
                                    
                                    <label htmlFor="avatar-upload" className="cursor-pointer block relative">
                                        <Avatar className="w-40 h-40 border-[6px] border-white dark:border-slate-900 shadow-xl bg-white transition-transform group-hover:scale-105">
                                            <AvatarImage src={avatarPreview} className="object-cover" />
                                            <AvatarFallback className="bg-slate-100 text-slate-400 text-5xl font-bold">
                                                {getInitials(formData.full_name)}
                                            </AvatarFallback>
                                        </Avatar>

                                        {/* Overlay de cámara al hacer hover */}
                                        <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <Camera className="w-10 h-10 text-white drop-shadow-md" />
                                        </div>

                                        {/* Botón flotante siempre visible */}
                                        <div className="absolute bottom-2 right-2 bg-emerald-600 text-white p-2.5 rounded-full shadow-lg border-2 border-white dark:border-slate-800 hover:bg-emerald-700 transition-colors">
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

                                <p className="text-xs text-slate-400 mt-4 font-medium">
                                    Click image to change (Max 2MB)
                                </p>

                                <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-6 mb-1">
                                    {formData.full_name || t('profile.placeholders.name', 'Your Name')}
                                </h2>
                                <p className="text-slate-500 text-sm mb-6 flex items-center justify-center gap-1">
                                    <Mail className="w-3 h-3" /> {formData.email}
                                </p>

                                <div className="flex flex-wrap gap-2 justify-center mb-8">
                                    <Badge variant="secondary" className="bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 capitalize">
                                        {profile?.role?.replace('_', ' ') || 'User'}
                                    </Badge>
                                    {profile?.genesis_profile && (() => {
                                        // LOGICA DINÁMICA DE PERFIL
                                        const slug = profile.genesis_profile.toLowerCase();
                                        const pData = getInvestorProfileBySlug(slug);
                                        // Usamos las claves de traducción existentes en locales/xx.json
                                        const label = t(`genesisQuest.profiles.genesis.${slug}.title`, pData?.title || `${profile.genesis_profile} Profile`);
                                        
                                        return (
                                            <Badge className="bg-indigo-100 text-indigo-700 border-0 capitalize">
                                                {label}
                                            </Badge>
                                        );
                                    })()}
                                </div>

                                <div className="mt-auto w-full bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-xl p-4 text-left shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sparkles className="w-4 h-4 text-amber-500" />
                                        <span className="text-xs font-bold text-amber-800 dark:text-amber-200 uppercase tracking-wide">
                                            {t('profile.gamification_card.tip_label', 'Reward')}
                                        </span>
                                    </div>
                                    <p className="text-xs text-amber-700 dark:text-amber-300/80 leading-relaxed">
                                        Update your profile details to earn +25.
                                    </p>
                                </div>
                            </div>

                            {/* COLUMNA DERECHA: FORMULARIO */}
                            <div className="md:col-span-7 lg:col-span-8 p-8 md:p-12">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                        <User className="w-5 h-5 text-emerald-600" />
                                        {t('profile.edit_details', 'Edit Details')}
                                    </h3>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    
                                    {/* 1. INFORMACIÓN PERSONAL */}
                                    <div className="grid gap-6 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                {t('profile.labels.full_name', 'Full Name')} <span className="text-red-500">*</span>
                                            </label>
                                            <Input
                                                name="full_name"
                                                value={formData.full_name}
                                                onChange={handleChange}
                                                className="h-11 bg-white"
                                                placeholder="Your Name"
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                Phone Number
                                            </label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                                                <Input
                                                    name="phone"
                                                    value={formData.phone}
                                                    onChange={handleChange}
                                                    className="h-11 pl-10 bg-white"
                                                    placeholder="+1 234 567 890"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. UBICACIÓN */}
                                    <div className="grid gap-6 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                City
                                            </label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                                                <Input
                                                    name="city"
                                                    value={formData.city}
                                                    onChange={handleChange}
                                                    className="h-11 pl-10 bg-white"
                                                    placeholder="Berlin"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                Country
                                            </label>
                                            <Input
                                                name="country"
                                                value={formData.country}
                                                onChange={handleChange}
                                                className="h-11 bg-white"
                                                placeholder="Germany"
                                            />
                                        </div>
                                    </div>

                                    {/* 3. BIOGRAFÍA */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                            {t('profile.labels.bio', 'Bio')}
                                        </label>
                                        <Textarea
                                            name="bio"
                                            value={formData.bio}
                                            onChange={handleChange}
                                            className="resize-none min-h-[100px] bg-white p-4 leading-relaxed border-slate-200"
                                            placeholder={t('profile.placeholders.bio', 'Tell us about yourself...')}
                                            maxLength={500}
                                        />
                                        <div className="flex justify-end">
                                            <span className="text-xs text-slate-400 font-medium">
                                                {formData.bio.length}/500 {t('profile.character_count', 'characters')}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                                        <Button
                                            type="submit"
                                            disabled={loading}
                                            className="px-8 h-12 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200/50 hover:shadow-emerald-200/80 transition-all hover:-translate-y-0.5 rounded-xl"
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