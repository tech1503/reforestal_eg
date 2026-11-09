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
    let percentages = profile?.profile_percentages || { ambiente: 0, colaboracion: 0, datos_solidos: 0 };
    let total = percentages.ambiente + percentages.colaboracion + percentages.datos_solidos;

    if (total === 0 && profile?.genesis_profile) {
        const legacyProfile = profile.genesis_profile.toLowerCase();
        percentages = {
            ambiente: legacyProfile === 'ambiente' ? 100 : 0,
            colaboracion: legacyProfile === 'colaboracion' ? 100 : 0,
            datos_solidos: legacyProfile === 'datos_solidos' ? 100 : 0,
        };
        total = 100;
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
                    {/* Habilidad AMBIENTE */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-end text-sm">
                            <div className="flex items-center gap-2 text-white font-medium">
                                <Leaf className="w-4 h-4 text-emerald-400" />
                                {t('skills.ambiente', 'Ambiente')}
                            </div>
                            <span className="text-emerald-300 font-black">{percentages.ambiente}%</span>
                        </div>
                        <Progress value={percentages.ambiente} className="h-2.5 bg-[#5b8370]/30 rounded-full overflow-hidden shadow-inner" indicatorClassName="bg-gradient-to-r from-emerald-400 to-emerald-200 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                    </div>

                    {/* Habilidad COLABORACIÓN */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-end text-sm">
                            <div className="flex items-center gap-2 text-white font-medium">
                                <Shield className="w-4 h-4 text-blue-400" />
                                {t('skills.colaboracion', 'Colaboración')}
                            </div>
                            <span className="text-blue-300 font-black">{percentages.colaboracion}%</span>
                        </div>
                        <Progress value={percentages.colaboracion} className="h-2.5 bg-[#5b8370]/30 rounded-full overflow-hidden shadow-inner" indicatorClassName="bg-gradient-to-r from-blue-400 to-indigo-300 rounded-full shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
                    </div>

                    {/* Habilidad DATOS SOLIDOS */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-end text-sm">
                            <div className="flex items-center gap-2 text-white font-medium">
                                <Users className="w-4 h-4 text-violet-400" />
                                {t('skills.datos_solidos', 'Datos Sólidos')}
                            </div>
                            <span className="text-violet-300 font-black">{percentages.datos_solidos}%</span>
                        </div>
                        <Progress value={percentages.datos_solidos} className="h-2.5 bg-[#5b8370]/30 rounded-full overflow-hidden shadow-inner" indicatorClassName="bg-gradient-to-r from-violet-400 to-fuchsia-300 rounded-full shadow-[0_0_8px_rgba(167,139,250,0.5)]" />
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default ImpactProfileProgress;