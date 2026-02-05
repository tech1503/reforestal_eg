import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Download, RefreshCw, ExternalLink, Loader2, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { generateLandDollarWithQR } from '@/utils/landDollarQRRenderer';

// PRODUCCIÓN: Usamos la imagen local. Asegúrate de que exista en public/assets/
const LAND_DOLLAR_BG = '/assets/land-dollar-base.png';

const LandDollarDisplay = ({ 
  user, 
  landDollar, 
  onRegenerate, 
  isAdmin = false 
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  // DETECTAR SI ESTÁ SUSPENDIDO
  const isSuspended = landDollar?.status === 'suspended' || landDollar?.status === 'blocked';

  const uniqueRef = landDollar?.link_ref || user?.user_metadata?.referral_code || user?.id?.substring(0, 8).toUpperCase();
  const referralLink = `https://reforest.al/ref/${uniqueRef}`;

  const handleCopyRef = () => {
    if (isSuspended) {
        toast({ variant: "destructive", title: "Asset Suspended", description: "Referral links are disabled." });
        return;
    }
    if (uniqueRef) {
      navigator.clipboard.writeText(referralLink);
      toast({ title: t('common.copied_clipboard'), description: "Referral Link Copied" });
    }
  };

  const handleDownload = async () => {
    if (isSuspended) return; // Bloqueo de seguridad
    
    setIsDownloading(true);
    try {
        const imageBlob = await generateLandDollarWithQR(uniqueRef);
        const url = window.URL.createObjectURL(imageBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `Reforestal_LandDollar_${uniqueRef}.png`; 
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast({ title: "Download Started", description: "Your digital asset is ready." });

    } catch (error) {
        console.error("Download failed:", error);
        toast({ variant: "destructive", title: "Download Error", description: "Could not generate image. Please contact support." });
    } finally {
        setIsDownloading(false);
    }
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(referralLink)}&bgcolor=ffffff&color=1A4231&margin=2`;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative w-full aspect-[2.4/1] rounded-2xl overflow-hidden shadow-2xl border border-emerald-900/20 group"
      >
        {/* FONDO LOCAL (Carga instantánea) */}
        <img 
          src={LAND_DOLLAR_BG} 
          alt="Reforestal Land Dollar" 
          className={`absolute inset-0 w-full h-full object-cover transition-all ${isSuspended ? 'grayscale opacity-50' : ''}`}
        />

        {/* --- CAPA DE SUSPENSIÓN (NUEVO) --- */}
        {isSuspended && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold text-xl tracking-widest shadow-2xl border-2 border-red-400 rotate-[-15deg] flex items-center gap-3 transform scale-110">
                    <Ban className="w-6 h-6" /> SUSPENDED
                </div>
            </div>
        )}

        {/* QR Y REF (Se ocultan si está suspendido) */}
        {!isSuspended && (
            <div className="absolute top-1/2 right-[18%] -translate-y-1/2 flex flex-col items-center w-[14%]">
                <div className="bg-white/90 p-1 rounded-lg shadow-lg backdrop-blur-sm w-full aspect-square mb-2">
                    <img src={qrUrl} alt="Unique QR" className="w-full h-full object-contain mix-blend-multiply" />
                </div>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div onClick={handleCopyRef} className="bg-emerald-950/90 text-emerald-100 text-[9px] md:text-[10px] font-mono py-0.5 px-2 rounded-full cursor-pointer hover:bg-emerald-800 transition-colors border border-emerald-500/30 truncate max-w-full text-center shadow-md">
                                {uniqueRef}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent><p>Click to Copy Link</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        )}

        <div className="absolute top-4 right-6 z-10">
             <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm backdrop-blur-md ${
                 isSuspended ? 'bg-red-500/90 text-white' : 
                 landDollar?.status === 'active' ? 'bg-emerald-500/80 text-white' : 'bg-slate-500/80 text-white'
             }`}>
                {landDollar?.status || 'Active'}
             </span>
        </div>
      </motion.div>

      <div className="flex flex-wrap justify-center gap-4">
        <Button 
            onClick={handleDownload} 
            disabled={isDownloading || isSuspended} 
            className={`${isSuspended ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-800 hover:bg-emerald-900'} text-white shadow-lg border border-emerald-700 min-w-[200px]`}
        >
            {isDownloading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Download className="w-4 h-4 mr-2" /> {isSuspended ? 'Asset Locked' : t('dashboard.land_dollar.download', 'Download High-Res Asset')}</>}
        </Button>
        
        {isAdmin && <Button variant="outline" onClick={onRegenerate} className="border-slate-300 hover:bg-slate-50"><RefreshCw className="w-4 h-4 mr-2" /> Regenerate</Button>}
        
        <Button 
            variant="ghost" 
            onClick={() => !isSuspended && window.open(referralLink, '_blank')} 
            disabled={isSuspended}
            className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
        >
            <ExternalLink className="w-4 h-4 mr-2" /> Link Ref
        </Button>
      </div>
    </div>
  );
};

export default LandDollarDisplay;