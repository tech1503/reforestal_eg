import React from 'react';
import { Leaf, Shield, Users, ArrowRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

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
            <div className="p-6 bg-[#063127]/60 border border-[#5b8370]/30 rounded-2xl text-center">
                <Leaf className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                <h3 className="text-white font-bold text-lg mb-2">
                    {t('impactQuest.title', 'Descubre tu Perfil de Impacto')}
                </h3>
                <p className="text-[#c4d1c0] text-sm mb-4">
                    {t('impactQuest.invite_desc', 'Completa nuestro cuestionario para descubrir cómo alinear tus intereses con nuestros proyectos.')}
                </p>
                <Button asChild className="bg-amber-500 hover:bg-amber-600 text-[#063127] font-bold">
                    <Link to="/genesis-quest">
                        {t('impactQuest.start_quest', 'Iniciar Cuestionario')} <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                </Button>
            </div>
        );
    }

    // Si ya tiene porcentajes (o si era antiguo y lo forzamos a 100), mostramos las barras de progreso
    return (
        <div className="p-5 sm:p-6 bg-[#063127]/60 border border-[#5b8370]/30 rounded-2xl w-full">
            <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                <Leaf className="w-5 h-5 text-amber-500" />
                {t('impactQuest.your_impact_focus', 'Tu Enfoque de Impacto')}
            </h3>

            <div className="space-y-5">
                {/* Perfil LENA */}
                <div className="space-y-1.5">
                    <div className="flex justify-between items-end text-sm">
                        <div className="flex items-center gap-2 text-white font-medium">
                            <Leaf className="w-4 h-4 text-green-400" />
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
    );
};

export default ImpactProfileProgress;