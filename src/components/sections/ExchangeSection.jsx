import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, Coins, Gift, TreePine, Award, Leaf, X, Minus, Plus, Lock, Image as ImageIcon, Loader2, HeartHandshake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useFinancial } from '@/contexts/FinancialContext'; 
import ReadOnlyOverlay from '@/components/ui/ReadOnlyOverlay';
import StartnextSupportModal from '@/components/ui/StartnextSupportModal';
import RedeemImpactCreditsModal from '@/components/ui/RedeemImpactCreditsModal';

const ExchangeSection = ({ isReadOnly = false }) => {
  const { t, i18n } = useTranslation(); 
  const { user } = useAuth();
  const { toast } = useToast();
  
  const { balance, refreshFinancials } = useFinancial();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);

  const categories = [
    { id: 'all', label: t('exchange.categories.all'), icon: Gift },
    { id: 'reforestation', label: t('exchange.categories.reforestation'), icon: TreePine },
    { id: 'merch', label: t('exchange.categories.merch'), icon: Award },
    { id: 'digital', label: t('exchange.categories.digital'), icon: Leaf }
  ];

  const getProducts = useCallback(async () => {
    try {
      // JOIN COMPLETO: Productos + Traducciones
      const { data: productData, error: productError } = await supabase
        .from('exchange_products')
        .select(`
            *,
            exchange_product_translations (
                language_code,
                name,
                description,
                impact_description
            )
        `)
        .order('name');

      if (productError) throw productError;

      // FILTRO DE VISIBILIDAD: Solo mostrar si stock > 0 (o infinito) Y está activo
      const availableProducts = (productData || []).filter(p => 
          (p.stock === -1 || p.stock > 0) && 
          (p.is_active === true) // Filtro crítico de Admin
      );
      
      setProducts(availableProducts);
    } catch (e) {
      console.error("Exchange Init Error:", e);
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('exchange.errors.load_failed')
      });
    } finally {
        setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    getProducts();
    // Suscripción a ambos canales para actualización en tiempo real
    const sub1 = supabase.channel('exchange_realtime_main')
       .on('postgres_changes', { event: '*', schema: 'public', table: 'exchange_products' }, getProducts)
       .subscribe();
    // También escuchamos cambios en traducciones
    const sub2 = supabase.channel('exchange_realtime_trans')
       .on('postgres_changes', { event: '*', schema: 'public', table: 'exchange_product_translations' }, getProducts)
       .subscribe();

    return () => { 
        supabase.removeChannel(sub1);
        supabase.removeChannel(sub2);
    };
  }, [getProducts]);

  // --- HELPER MAESTRO DE TRADUCCIÓN ---
  const getTranslatedContent = (product) => {
      const lang = i18n.language ? i18n.language.split('-')[0] : 'en';
      
      if (lang === 'en') {
          return {
              name: product.name,
              description: product.description,
              impact: product.impact_description || t('exchange.default_impact_desc')
          };
      }

      const translation = product.exchange_product_translations?.find(t => t.language_code === lang);

      return {
          name: translation?.name || product.name,
          description: translation?.description || product.description,
          impact: translation?.impact_description || product.impact_description || t('exchange.default_impact_desc')
      };
  };

  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(p => (p.category || 'other').toLowerCase().includes(selectedCategory));

  const userCredits = Number(balance) || 0;
  const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);

  const updateCartItem = (productId, quantity) => {
    if (isReadOnly) {
      toast({ variant: "destructive", title: t('exchange.toasts.pioneer_exclusive'), description: t('exchange.toasts.upgrade_hint') });
      return;
    }
    if (quantity <= 0) {
      setCart(cart.filter(item => item.id !== productId));
      return;
    }
    const existing = cart.find(item => item.id === productId);
    if (existing) setCart(cart.map(item => item.id === productId ? { ...item, quantity } : item));
    else {
        const product = products.find(p => p.id === productId);
        if(product) setCart([...cart, { ...product, quantity }]);
    }
  };

  const handleCheckout = async () => {
    if (isReadOnly || cart.length === 0) return;
    if (userCredits < cartTotal) {
      toast({ variant: "destructive", title: t('exchange.errors.insufficient_credits') });
      return;
    }

    setLoading(true);
    let hasError = false;

    for (const item of cart) {
        const { error } = await supabase.rpc('purchase_with_credits', {
            p_user_id: user.id,
            p_product_id: item.id,
            p_quantity: item.quantity
        });
        if (error) {
            toast({ variant: "destructive", title: "Error", description: error.message });
            hasError = true;
        }
    }

    if (!hasError) {
        toast({ title: t('common.success'), description: t('exchange.toasts.exchange_success') });
        setCart([]);
        setIsCartOpen(false);
        await refreshFinancials(); 
    }
    setLoading(false);
  };

  const ProductImage = ({ src, alt }) => {
      if (src && (src.startsWith('http') || src.startsWith('https'))) {
          return <img src={src} alt={alt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />;
      }
      return <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground"><ImageIcon className="w-12 h-12"/></div>;
  };

  return (
    <div className="relative min-h-[500px]">
      <StartnextSupportModal isOpen={isSupportModalOpen} onClose={() => setIsSupportModalOpen(false)} />
      <RedeemImpactCreditsModal isOpen={isRedeemModalOpen} onClose={() => setIsRedeemModalOpen(false)} currentBalance={userCredits} />

      {/* Header and Filters */}
      <div className="flex flex-col gap-6 mb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h2 className="text-3xl font-bold text-foreground">{t('exchange.title')}</h2>
            <p className="text-muted-foreground mt-2">{t('exchange.subtitle')}</p>
          </div>
          
          <div className="flex items-center gap-4 mt-4 sm:mt-0">
             {isReadOnly && (
                <Button onClick={() => setIsSupportModalOpen(true)} variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hidden md:flex">
                  <HeartHandshake className="w-4 h-4 mr-2" /> {t('exchange.cta.support_startnext')}
                </Button>
             )}
             <div className="bg-card px-4 py-2 rounded-xl border shadow-sm flex items-center gap-3">
                <div className="text-right">
                   <p className="text-xs text-muted-foreground font-medium uppercase">{t('exchange.labels.balance')}</p>
                   <p className="text-xl font-bold text-emerald-600 font-mono">{userCredits.toLocaleString()}</p>
                </div>
                <div className="bg-emerald-100 p-2 rounded-full"><Coins className="w-6 h-6 text-emerald-600" /></div>
             </div>
             
             <Button onClick={() => setIsCartOpen(true)} variant="outline" className="relative h-12" disabled={isReadOnly}>
               <ShoppingCart className="w-5 h-5" />
               {cart.length > 0 && (
                 <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                   {cart.reduce((sum, item) => sum + item.quantity, 0)}
                 </span>
               )}
               {isReadOnly && <Lock className="w-3 h-3 ml-2 text-muted-foreground"/>}
             </Button>
          </div>
        </motion.div>

        {isReadOnly && (
            <Button onClick={() => setIsSupportModalOpen(true)} variant="outline" className="w-full bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 md:hidden">
              <HeartHandshake className="w-4 h-4 mr-2" /> {t('exchange.cta.support_startnext')}
            </Button>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button key={category.id} onClick={() => setSelectedCategory(category.id)} className={`flex items-center px-4 py-2 rounded-lg transition-all duration-200 ${selectedCategory === category.id ? 'bg-emerald-600 text-white shadow-md' : 'bg-card text-muted-foreground hover:bg-emerald-50 border border-border'}`}>
                <Icon className="w-4 h-4 mr-2" /> {category.label}
              </button>
            );
          })}
        </motion.div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
           Array(3).fill(0).map((_, i) => <div key={i} className="h-80 bg-muted rounded-xl animate-pulse"/>)
        ) : filteredProducts.length === 0 ? (
           <div className="col-span-full py-12 text-center text-muted-foreground">
               <TreePine className="w-12 h-12 mx-auto mb-3 opacity-20" />
               <p>{t('exchange.empty_category')}</p>
           </div>
        ) : (
          filteredProducts.map((product, index) => {
             const canAfford = userCredits >= product.price;
             const content = getTranslatedContent(product);

             return (
              <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }} className="bg-card rounded-xl shadow-sm border border-emerald-100 overflow-hidden hover:shadow-lg transition-all flex flex-col group relative">
                {isReadOnly && (
                    <ReadOnlyOverlay title={t('roles.explorer_level_1')} message={t('exchange.overlay.message')} subMessage={t('exchange.overlay.sub_message')} />
                )}
                
                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                  <ProductImage src={product.image_url} alt={content.name} />
                  
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-medium text-muted-foreground shadow-sm">
                      {product.stock === -1 ? t('exchange.stock.infinite') : `${product.stock} ${t('exchange.stock.left')}`}
                  </div>
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-bold text-lg text-foreground mb-1 line-clamp-1">{content.name}</h3>
                  <div className="flex items-center gap-1 text-emerald-600 font-mono font-bold mb-3"><Coins className="w-4 h-4" /> {product.price}</div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">{content.description}</p>
                  
                  <div className="bg-emerald-50/50 p-2 rounded-lg mb-4 text-xs text-emerald-800 flex items-start gap-2">
                      <Leaf className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>{content.impact}</span>
                  </div>

                  <Button onClick={() => updateCartItem(product.id, (cart.find(i => i.id === product.id)?.quantity || 0) + 1)} className={`w-full text-white mt-auto shadow-md ${!canAfford ? 'opacity-80' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'}`} disabled={isReadOnly || !canAfford}>
                    {isReadOnly ? <><Lock className="w-4 h-4 mr-2"/> {t('common.locked_feature')}</> : 
                     !canAfford ? t('exchange.errors.insufficient_credits') : <><ShoppingCart className="w-4 h-4 mr-2"/> {t('exchange.buttons.add_to_cart')}</>}
                  </Button>
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
           <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
           <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="h-full w-full max-w-md bg-card shadow-2xl flex flex-col">
              <div className="p-5 border-b flex items-center justify-between bg-muted/30">
                  <h3 className="font-bold text-lg flex items-center gap-2 text-foreground"><ShoppingCart className="w-5 h-5 text-emerald-600"/> {t('exchange.cart.title')}</h3>
                  <Button variant="ghost" size="icon" onClick={() => setIsCartOpen(false)}><X className="w-5 h-5" /></Button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {cart.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground">
                          <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-20"/>
                          <p>{t('exchange.cart.empty')}</p>
                          <Button variant="link" onClick={() => setIsCartOpen(false)}>{t('exchange.cart.browse')}</Button>
                      </div>
                  ) : (
                      cart.map(item => {
                          const content = getTranslatedContent(item);
                          return (
                              <div key={item.id} className="flex gap-4 p-3 rounded-xl border bg-muted/20">
                                  <div className="w-16 h-16 bg-card rounded-lg border overflow-hidden shrink-0 flex items-center justify-center">
                                      {item.image_url ? <img src={item.image_url} className="w-full h-full object-cover" alt={content.name}/> : <ImageIcon className="w-6 h-6 text-muted-foreground"/>}
                                  </div>
                                  <div className="flex-1">
                                      <h4 className="font-bold text-sm text-foreground line-clamp-1">{content.name}</h4>
                                      <div className="flex items-center gap-1 text-emerald-600 font-mono text-xs font-bold mt-1"><Coins className="w-3 h-3"/> {item.price}</div>
                                  </div>
                                  <div className="flex flex-col items-end justify-between">
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500" onClick={() => updateCartItem(item.id, 0)}><X className="w-3 h-3"/></Button>
                                      <div className="flex items-center gap-2 bg-card rounded-lg border px-1">
                                          <button className="p-1 hover:text-emerald-600" onClick={() => updateCartItem(item.id, item.quantity - 1)} disabled={item.quantity <= 1}><Minus className="w-3 h-3"/></button>
                                          <span className="text-sm font-mono w-4 text-center">{item.quantity}</span>
                                          <button className="p-1 hover:text-emerald-600" onClick={() => updateCartItem(item.id, item.quantity + 1)}><Plus className="w-3 h-3"/></button>
                                      </div>
                                  </div>
                              </div>
                          );
                      })
                  )}
              </div>
              <div className="p-5 border-t bg-muted/30 space-y-4">
                  <div className="flex justify-between text-lg font-bold text-foreground"><span>{t('exchange.labels.total')}</span><span className="text-emerald-600 font-mono">{cartTotal.toLocaleString()} </span></div>
                  <Button onClick={handleCheckout} className="w-full py-6 font-bold text-lg shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white" disabled={loading || cart.length === 0 || userCredits < cartTotal}>
                    {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : t('exchange.buttons.confirm')}
                  </Button>
              </div>
           </motion.div>
        </div>
      )}
    </div>
  );
};

export default ExchangeSection;