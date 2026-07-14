import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2 } from 'lucide-react';
import PageDollar from '@/pages/PageDollar';
import PageUnderscore from '@/pages/PageUnderscore';
import PagePeter from '@/pages/PagePeter';

const DynamicRouteHandler = ({ fallback }) => {
    const { username } = useParams();
    const slug = username?.toLowerCase(); 
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [linkData, setLinkData] = useState(null);

    useEffect(() => {
        const fetchAndRoute = async () => {
            if (!slug) return;
            
            try {
                // 1. Buscamos el slug en Supabase (QRs Dinámicos)
                const { data, error } = await supabase
                    .from('dynamic_links')
                    .select('*')
                    .eq('slug', slug)
                    .eq('is_active', true)
                    .maybeSingle(); 

                if (error) throw error;

                if (!data) {
                    // 2. Si no está en dynamic_links, es un referidor orgánico (ej: /carlos123)
                    setLinkData({ isReferral: true });
                    setLoading(false);
                    return;
                }

                // 3. ¡ES UN QR DINÁMICO! Aumentamos el contador de visitas
                supabase.rpc('increment_link_visits', { link_slug: slug }).catch(console.error);

                // 4. Si a futuro agregas un QR de redirección externa
                if (data.action_type === 'redirect' && data.target_url) {
                    window.location.replace(data.target_url);
                    return; 
                }

                // 5. Guardamos la info para renderizar la página interna
                setLinkData(data);
                setLoading(false);
                
            } catch (err) {
                console.error("Error validando el enlace:", err);
                // Si falla la red o DB, asumimos referidor para no romper la app
                setLinkData({ isReferral: true });
                setLoading(false);
            }
        };

        fetchAndRoute();
    }, [slug]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-transparent">
                <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
            </div>
        );
    }

    // 6. Si determinamos que no era un QR, inyectamos tu lógica de referidos
    if (linkData?.isReferral) {
        return fallback;
    }

    // 7. Renderizamos las páginas internas correspondientes
    if (linkData?.action_type === 'internal_page') {
        if (slug === '$') return <PageDollar />;
        if (slug === '_') return <PageUnderscore />;
        if (slug === 'qr-peter') return <PagePeter />;
        
        // PARA EL FUTURO: Añadir más "if (slug === 'nuevo-qr') return <TuNuevoComponente />" arriba de esto. Y listo.
        
        // Fallback visual por si en el futuro agregamos un QR interno en Base de Datos pero olvidas crear el componente en React.
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-transparent p-6">
                <h1 className="text-4xl font-bold text-gold-600 mb-4">
                    Página en preparación
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-300">
                    El contenido para "{slug}" estará disponible pronto.
                </p>
            </div>
        );
    }

    return <Navigate to="/" replace />;
};

export default DynamicRouteHandler;