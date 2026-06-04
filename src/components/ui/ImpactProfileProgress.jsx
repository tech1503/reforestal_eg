import React from 'react';
import { Leaf, Shield, Users, ArrowRight, Trees } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

const ImpactProfileProgress = ({ profile }) => {
    const { t } = useTranslation();

    // Extraemos los porcentajes
    let percentages = profile?.profile_percentages || { lena: 0, markus: 0, david: 0 };
    let total = percentages.lena + percentages.markus + percentages.david;

    // MAGIA DE MIGRACIÓN: Si el total es 0, pero el usuario YA TIENE un perfil antiguo
    if (total === 0 && profile?.genesis_profile) {
        const legacyProfile = profile.genesis_profile.toLowerCase();
        percentages = {
            lena: legacyProfile === 'lena' ? 100 : 0,
            markus: legacyProfile === 'markus' ? 100 : 0,
            david: legacyProfile === 'david' ? 100 : 0,
        };
        total = 100; // Forzamos el total a 100 para que pase la validación y no muestre el botón
    }

    // Si el usuario es REALMENTE nuevo (total 0 y no tiene perfil antiguo)
    if (total === 0) {
        return (
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative p-[1px] rounded-2xl overflow-hidden"
            >
                {/* Fondo animado brillante detrás de la caja */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#cf9c2a]/10 via-[#cf9c2a]/30 to-[#cf9c2a]/10 animate-pulse-glow rounded-2xl pointer-events-none"></div>
                
                <div className="relative p-6 sm:p-8 bg-[#063127]/90 backdrop-blur-sm border border-[#cf9c2a]/40 rounded-2xl text-center shadow-glow flex flex-col items-center">
                    
                    {/* Icono con animación de latido/balanceo */}
                    <motion.div
                        animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    >
                        <Leaf className="w-8 h-8 text-[#cf9c2a] mx-auto mb-4 drop-shadow-md" />
                    </motion.div>
                    
                    <h3 className="font-extrabold text-xl sm:text-2xl mb-2 text-gradient-gold">
                        {t('impactQuest.title', 'Descubre tu Perfil de Impacto')}
                    </h3>
                    
                    <p className="text-[#c4d1c0] text-sm mb-8 max-w-sm mx-auto leading-relaxed">
                        {t('impactQuest.invite_desc', 'Completa nuestro cuestionario para descubrir cómo alinear tus intereses con nuestros proyectos.')}
                    </p>
                    
                    {/* Botón con animación de flote (arriba-abajo) suave - TAMAÑO REDUCIDO Y LETRAS BLANCAS */}
                    <motion.div
                        animate={{ y: [0, -4, 0] }}
                        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                        className="w-full sm:w-auto"
                    >
                        <Button asChild className="w-full sm:w-auto bg-gradient-gold text-white hover:brightness-110 font-bold border-none shadow-glow px-6 py-2.5 rounded-full text-sm transition-all hover:scale-105">
                            <Link to="/genesis-quest">
                                {t('impactQuest.start_quest', 'Iniciar Cuestionario')} <ArrowRight className="w-4 h-4 ml-2" />
                            </Link>
                        </Button>
                    </motion.div>
                </div>
            </motion.div>
        );
    }

    // Si ya tiene porcentajes (o si era antiguo y lo forzamos a 100), mostramos las barras de progreso CON MOTION
    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative p-[1px] rounded-2xl w-full"
        >
            {/* Animación sutil de borde dorado para el perfil completo */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#5b8370]/10 via-[#cf9c2a]/20 to-[#5b8370]/10 animate-pulse-glow rounded-2xl pointer-events-none"></div>

            <div className="relative p-5 sm:p-6 bg-[#063127]/80 backdrop-blur-sm border border-[#5b8370]/30 rounded-2xl w-full shadow-lg">
                <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                    {/* Animación continua en el icono de la hoja para dar vida al componente */}
                    <motion.div
                        animate={{ rotate: [0, 15, -10, 0], scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    >
                        <Leaf className="w-5 h-5 text-[#cf9c2a] drop-shadow-md" />
                    </motion.div>
                    {t('impactQuest.your_impact_focus', 'Tu Enfoque de Impacto')}
                </h3>

                <div className="space-y-5">
                    {/* Perfil LENA */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-end text-sm">
                            <div className="flex items-center gap-2 text-white font-medium">
                                <Trees className="w-4 h-4 text-green-400" />
                                {t('impactQuest.profiles.lena', 'Acción Ecológica')}
                            </div>
                            <span className="text-green-400 font-bold">{percentages.lena}%</span>
                        </div>
                        {/* Usamos indicatorClassName como lo dicta tu archivo progress.jsx */}
                        <Progress value={percentages.lena} className="h-2 bg-[#5b8370]/30" indicatorClassName="bg-green-400" />
                    </div>

                    {/* Perfil MARKUS */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-end text-sm">
                            <div className="flex items-center gap-2 text-white font-medium">
                                <Shield className="w-4 h-4 text-blue-400" />
                                {t('impactQuest.profiles.markus', 'Sostenibilidad Estructural')}
                            </div>
                            <span className="text-blue-400 font-bold">{percentages.markus}%</span>
                        </div>
                        {/* Usamos indicatorClassName */}
                        <Progress value={percentages.markus} className="h-2 bg-[#5b8370]/30" indicatorClassName="bg-blue-400" />
                    </div>

                    {/* Perfil DAVID */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-end text-sm">
                            <div className="flex items-center gap-2 text-white font-medium">
                                <Users className="w-4 h-4 text-orange-400" />
                                {t('impactQuest.profiles.david', 'Comunidad Global')}
                            </div>
                            <span className="text-orange-400 font-bold">{percentages.david}%</span>
                        </div>
                        {/* Usamos indicatorClassName */}
                        <Progress value={percentages.david} className="h-2 bg-[#5b8370]/30" indicatorClassName="bg-orange-400" />
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default ImpactProfileProgress;