import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Download, RefreshCw, ExternalLink, Loader2, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { generateLandDollarWithQR } from '@/utils/landDollarQRRenderer';

import landDollarBaseImg from '@/assets/land-dollar-base.png';

const LandDollarDisplay = ({ 
  user, 
  landDollar, 
  onRegenerate, 
  isAdmin = false 
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  const isSuspended = landDollar?.status === 'suspended' || landDollar?.status === 'blocked';
  const uniqueRef = landDollar?.link_ref || user?.user_metadata?.referral_code || 'PENDING';
  const referralLink = `https://reforest.al/ref/${uniqueRef}`;

  const handleDownload = async () => {
    if (isSuspended || uniqueRef === 'PENDING') return;
    
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
        toast({ variant: "destructive", title: "Download Error", description: "Could not generate image." });
    } finally {
        setIsDownloading(false);
    }
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(referralLink)}&bgcolor=ffffff&color=1A4231&margin=2`;

  const handleCopyRef = () => {
      if (!isSuspended && uniqueRef !== 'PENDING') {
          navigator.clipboard.writeText(referralLink);
          toast({ title: "Copied!", description: "Link copied to clipboard." });
      }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative w-full aspect-[2.4/1] rounded-2xl overflow-hidden shadow-2xl border border-emerald-900/20 dark:border-emerald-500/20 group"
      >
        <img 
          src={landDollarBaseImg} 
          alt="Reforestal Land Dollar" 
          className={`absolute inset-0 w-full h-full object-cover transition-all ${isSuspended ? 'grayscale opacity-50' : ''}`}
        />

        {isSuspended && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="bg-destructive text-destructive-foreground px-6 py-2 rounded-lg font-bold text-xl tracking-widest shadow-2xl border-2 border-red-400 rotate-[-15deg] flex items-center gap-3 transform scale-110">
                    <Ban className="w-6 h-6" /> SUSPENDED
                </div>
            </div>
        )}

        {!isSuspended && (
            <div className="absolute top-1/2 right-[18%] -translate-y-1/2 flex flex-col items-center w-[14%]">
                <div className="bg-white/90 p-1 rounded-lg shadow-lg backdrop-blur-sm w-full aspect-square mb-2">
                    <img src={qrUrl} alt="Unique QR" className="w-full h-full object-contain mix-blend-multiply" />
                </div>
                
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                             <div 
                                onClick={handleCopyRef}
                                className="bg-emerald-950/90 text-emerald-100 text-[9px] md:text-[10px] font-mono py-0.5 px-2 rounded-full border border-emerald-500/30 truncate max-w-full text-center shadow-md cursor-pointer hover:bg-emerald-800 transition-colors"
                             >
                                {uniqueRef}
                             </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Click to Copy Link</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        )}

        <div className="absolute top-4 right-6 z-10">
             <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm backdrop-blur-md ${
                 isSuspended ? 'bg-destructive/90 text-destructive-foreground' : 
                 landDollar?.status === 'active' || landDollar?.status === 'issued' ? 'bg-emerald-500/80 text-white' : 'bg-muted/80 text-muted-foreground'
             }`}>
                {landDollar?.status || 'Active'}
             </span>
        </div>
      </motion.div>

      <div className="flex flex-wrap justify-center gap-4">
        <Button 
            onClick={handleDownload} 
            disabled={isDownloading || isSuspended} 
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg min-w-[200px]"
        >
            {isDownloading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : <><Download className="w-4 h-4 mr-2" /> {isSuspended ? 'Locked' : t('dashboard.land_dollar.download', 'Download High-Res')}</>}
        </Button>
        
        {!isSuspended && (
             <Button 
                variant="ghost" 
                onClick={() => window.open(referralLink, '_blank')} 
                className="text-emerald-700 hover:bg-emerald-50"
             >
                <ExternalLink className="w-4 h-4 mr-2" /> Link Ref
            </Button>
        )}
      </div>
    </div>
  );
};

export default LandDollarDisplay;