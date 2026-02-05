import React from 'react';
import QRCode from 'qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Download, Share2, X, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next'; // IMPORTADO

const ShareQRModal = ({ isOpen, onClose, linkRef, imageUrl }) => {
  const { toast } = useToast();
  const { t } = useTranslation(); // HOOK
  const [copied, setCopied] = React.useState(false);
  const [qrDataUrl, setQrDataUrl] = React.useState('');

  const referralLink = `https://reforest.al/ref/${linkRef}`;

  React.useEffect(() => {
    if (linkRef && isOpen) {
      QRCode.toDataURL(referralLink, { width: 300, margin: 2, color: { dark: '#1A4231' } })
        .then(setQrDataUrl)
        .catch(console.error);
    }
  }, [linkRef, isOpen, referralLink]);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({ title: t('common.copied_clipboard'), description: t('dashboard.referrals.copy_link') });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `reforestal-qr-${linkRef}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white border-0 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-emerald-900">{t('common.share')}</DialogTitle>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {t('dashboard.referrals.program_desc')}
          </p>
        </DialogHeader>

        <div className="flex flex-col items-center py-6 space-y-6">
          {/* QR Code Container */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white p-4 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.08)] border border-emerald-100"
          >
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Referral QR" className="w-48 h-48" />
            ) : (
              <div className="w-48 h-48 bg-gray-100 animate-pulse rounded-lg" />
            )}
          </motion.div>

          {/* Link Input */}
          <div className="w-full space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('dashboard.referrals.unique_code')}</label>
            <div className="flex gap-2">
              <Input readOnly value={referralLink} className="bg-gray-50 font-mono text-sm border-gray-200" />
              <Button onClick={handleCopy} className={`min-w-[40px] transition-all ${copied ? 'bg-green-500' : 'bg-emerald-700'}`}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 w-full">
            <Button variant="outline" onClick={handleDownloadQR} className="w-full">
              <Download className="w-4 h-4 mr-2" /> {t('common.download')} QR
            </Button>
            <Button variant="outline" onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'Join Reforestal eG',
                  text: 'Join me in regenerating the Amazon rainforest!',
                  url: referralLink
                }).catch(console.error);
              } else {
                handleCopy();
              }
            }} className="w-full">
              <Share2 className="w-4 h-4 mr-2" /> {t('common.share')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareQRModal;