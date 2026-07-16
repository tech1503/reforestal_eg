import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, AlertCircle } from 'lucide-react';
import PageDollar from '@/pages/PageDollar';
import PageUnderscore from '@/pages/PageUnderscore';
import PagePeter from '@/pages/PagePeter';

const DynamicRouteHandler = ({ fallback }) => {
const { username } = useParams();
const navigate = useNavigate();

// 1. SOLUCIÓN AL ENCODING: Decodificamos "%24" para que vuelva a ser "$" y otros caracteres especiales. Esto es importante para que los QRs funcionen correctamente. 
let slug = '';
try {
    slug = username ? decodeURIComponent(username).toLowerCase() : '';
} catch (e) {
    slug = username?.toLowerCase() || '';
}

const [loading, setLoading] = useState(true);
const [linkData, setLinkData] = useState(null);
const [debugError, setDebugError] = useState(null);

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

            if (error) {
                setDebugError(`Supabase devolvió un error: ${error.message}`);
                setLoading(false);
                return;
            }

            if (!data) {
                // 2. MODO SEGURO: Si sabemos que es uno de los QRs, mostramos el error para depurar - Para poder ver cual es el error.
                if (['$', '_', 'qr-peter', 'peter'].includes(slug)) {
                    setDebugError(`Supabase conectó bien, pero bloqueó la lectura o no encontró el slug "${slug}". (Posible problema de RLS)`);
                    setLoading(false);
                    return;
                }

                // Si es un referidor normal (ej: /carlos123), sí hacemos fallback silencioso
                setLinkData({ isReferral: true });
                setLoading(false);
                return;
            }

            // 3. ¡ES UN QR DINÁMICO! Aumentamos el contador de visitas para registrar la estadística de cuántas veces se escanea este QR. Esto es útil para medir el impacto de cada QR.
            supabase.rpc('increment_link_visits', { link_slug: slug }).then(({ error: rpcError }) => {
                if (rpcError) console.error("Error sumando visita:", rpcError);
            });

            // 4. Si a futuro agregamos un QR de redirección externa
            if (data.action_type === 'redirect' && data.target_url) {
                window.location.replace(data.target_url);
                return; 
            }

            // 5. Guardamos la info para renderizar la página interna
            setLinkData(data);
            setLoading(false);
            
        } catch (err) {
            setDebugError(`Error interno de React: ${err.message || err}`);
            setLoading(false);
        }
    };

    fetchAndRoute();
}, [slug]);

if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-transparent">
            <Loader2 className="w-12 h-12 text-gold-500 animate-spin" />
        </div>
    );
}

// PANTALLA DE ALERTA: Atrapa los errores para que no vaya a /auth a ciegas
if (debugError) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-6 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
            <h1 className="text-2xl font-bold text-red-700 mb-2">Misterio Resuelto</h1>
            <p className="text-red-600 mb-4">La ruta interceptó el slug: <strong>"{slug}"</strong> pero ocurrió esto:</p>
            <code className="bg-white p-4 rounded-lg shadow-sm text-red-800 border border-red-200 block max-w-lg">
                {debugError}
            </code>
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
    if (slug === 'qr-peter' || slug === 'peter') return <PagePeter />;
    
    // PARA EL FUTURO: Añadir más "if (slug === 'nuevo-qr') return <TuNuevoComponente />" arriba de esto. Y listo.
    
    // Fallback visual por si en el futuro agregamos un QR interno en Base de Datos pero olvidas crear el componente en React.
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-transparent p-6">
            <h1 className="text-4xl font-bold text-gold-600 mb-4">
                Página en preparación
            </h1>
            <p className="text-lg text-gold-600 dark:text-slate-300">
                El contenido para "{slug}" estará disponible pronto.
            </p>
        </div>
    );
}

return <Navigate to="/" replace />;


};

export default DynamicRouteHandler;