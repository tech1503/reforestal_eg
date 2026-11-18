import React, { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2, AlertCircle } from 'lucide-react';
import PageDollar from '@/pages/PageDollar';
import PageUnderscore from '@/pages/PageUnderscore';
import PagePeter from '@/pages/PagePeter';

const SPECIAL_SLUGS = {
  '$': PageDollar,
  '_': PageUnderscore,
  'qr-peter': PagePeter,
  'peter': PagePeter,
};

const DynamicRouteHandler = () => {
  const { username, slug: routeSlug } = useParams();
  const { user, profile, loading: authLoading } = useAuth();
  const routeParam = username || routeSlug;

  let slug = '';
  try {
    slug = routeParam ? decodeURIComponent(routeParam).toLowerCase() : '';
  } catch (e) {
    slug = routeParam?.toLowerCase() || '';
  }

  const [loading, setLoading] = useState(true);
  const [linkData, setLinkData] = useState(null);
  const [debugError, setDebugError] = useState(null);
  const [anonRedirect, setAnonRedirect] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchAndRoute = async () => {
      setLoading(true);
      setLinkData(null);
      setDebugError(null);
      setAnonRedirect(false);

      if (!slug) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('dynamic_links')
          .select('*')
          .eq('slug', slug)
          .eq('is_active', true)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.error('Dynamic link lookup failed:', error);
          setLoading(false);
          return;
        }

        if (!data) {
          setLoading(false);
          return;
        }

        supabase.rpc('increment_link_visits', { link_slug: slug }).then(({ error: rpcError }) => {
          if (rpcError) console.error('Error sumando visita:', rpcError);
        });

        if (data.action_type === 'redirect' && data.target_url) {
          window.location.replace(data.target_url);
          return;
        }

        setLinkData(data);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setDebugError(`Error interno de React: ${err.message || err}`);
        setLoading(false);
      }
    };

    fetchAndRoute();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (authLoading || loading || linkData || debugError || !slug || user || SPECIAL_SLUGS[slug]) {
      return;
    }

    localStorage.setItem('reforestal_ref', slug);
    setAnonRedirect(true);
  }, [authLoading, loading, linkData, debugError, slug, user]);

  if (!slug) {
    return <Navigate to="/" replace />;
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-transparent">
        <Loader2 className="w-12 h-12 text-gold-500 animate-spin" />
      </div>
    );
  }

  const SpecialPage = SPECIAL_SLUGS[slug];
  if (SpecialPage) {
    return <SpecialPage />;
  }

  if (debugError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-6 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-red-700 mb-2">Misterio Resuelto</h1>
        <p className="text-red-600 mb-4">
          La ruta interceptó el slug: <strong>"{slug}"</strong> pero ocurrió esto:
        </p>
        <code className="bg-white p-4 rounded-lg shadow-sm text-red-800 border border-red-200 block max-w-lg">
          {debugError}
        </code>
      </div>
    );
  }

  if (linkData?.action_type === 'internal_page') {
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

  if (linkData) {
    return <Navigate to="/" replace />;
  }

  if (!user) {
    if (!anonRedirect) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-transparent">
          <Loader2 className="w-12 h-12 text-gold-500 animate-spin" />
        </div>
      );
    }

    return <Navigate to="/genesis-quest" replace />;
  }

  if (slug === profile?.referral_code) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-transparent p-6 text-center">
        <h1 className="text-2xl font-bold text-[#063127]">
          Este es tu propio código Land Dollar.
        </h1>
      </div>
    );
  }

  return <Navigate to={`/anastomose/${slug}`} replace />;
};

export default DynamicRouteHandler;
