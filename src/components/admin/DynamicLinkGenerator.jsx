import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, Download, QrCode, AlertTriangle, CheckCircle2 } from 'lucide-react';
import QRCodeLib from 'qrcode';
import landDollarBaseImg from '@/assets/land-dollar-base1.webp';

const DynamicLinkGenerator = () => {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [createDynamicQR, setCreateDynamicQR] = useState(false);
  const [printQROnLandDollar, setPrintQROnLandDollar] = useState(false);
  const [slug, setSlug] = useState('');
  const [processing, setProcessing] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [insertedSlug, setInsertedSlug] = useState(null);

  const handleGenerate = async () => {
    if (!slug.trim()) {
      toast({
        variant: 'destructive',
        title: t('admin.dynamicLinks.error', 'Error'),
        description: t('admin.dynamicLinks.slug_required', 'Debes ingresar un slug para el enlace dinámico.'),
      });
      return;
    }

    const sanitizedSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');

    setProcessing(true);
    setGeneratedImage(null);
    setInsertedSlug(null);

    try {
      if (createDynamicQR && printQROnLandDollar) {
        const { error: insertError } = await supabase.from('dynamic_links').insert({
          slug: sanitizedSlug,
          action_type: 'internal_page',
          target_url: null,
          page_content: null,
          is_active: true,
        });

        if (insertError) {
          if (insertError.code === '23505') {
            toast({
              variant: 'destructive',
              title: t('admin.dynamicLinks.duplicate', 'Slug duplicado'),
              description: t('admin.dynamicLinks.duplicate_desc', `El slug "${sanitizedSlug}" ya existe. Elige otro nombre.`),
            });
          } else {
            toast({
              variant: 'destructive',
              title: t('admin.dynamicLinks.error', 'Error'),
              description: insertError.message,
            });
          }
          setProcessing(false);
          return;
        }

        toast({
          className: 'bg-emerald-600 text-white border-none',
          title: t('admin.dynamicLinks.inserted', 'Enlace creado'),
          description: t('admin.dynamicLinks.inserted_desc', `Slug "${sanitizedSlug}" insertado en dynamic_links.`),
        });

        setInsertedSlug(sanitizedSlug);
      }

      if (printQROnLandDollar) {
        const slugForQR = sanitizedSlug;
        await generateCompositeImage(slugForQR);
      }

      toast({
        className: 'bg-emerald-600 text-white border-none',
        title: t('admin.dynamicLinks.generated', 'Land Dollar generado'),
        description: t('admin.dynamicLinks.generated_desc', 'La imagen se ha generado correctamente.'),
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('admin.dynamicLinks.error', 'Error'),
        description: err.message,
      });
    } finally {
      setProcessing(false);
    }
  };

  const generateCompositeImage = async (linkRef) => {
    const MAX_WIDTH = 1920;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = landDollarBaseImg;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('Failed to load Land Dollar base image'));
    });

    let targetWidth = img.width;
    let targetHeight = img.height;
    if (targetWidth > MAX_WIDTH) {
      const ratio = MAX_WIDTH / targetWidth;
      targetWidth = MAX_WIDTH;
      targetHeight = img.height * ratio;
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const qrUrl = `https://reforest.al/${linkRef}`;
    const qrDataUrl = await QRCodeLib.toDataURL(qrUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 1,
      color: { dark: '#064e3b', light: '#FFFFFF' },
    });

    const qrImg = new Image();
    qrImg.src = qrDataUrl;
    await new Promise((resolve) => { qrImg.onload = resolve; });

    const qrSize = targetWidth * 0.11;
    const qrX = targetWidth - qrSize - (targetWidth * 0.22);
    const qrY = (targetHeight - qrSize) * 0.44;

    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    ctx.globalCompositeOperation = 'source-over';

    const fontSize = Math.floor(targetWidth * 0.012);
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.fillStyle = '#064e3b';
    ctx.fillText(linkRef.toUpperCase(), qrX, qrY + qrSize + fontSize + 4);

    const dataUrl = canvas.toDataURL('image/png');
    setGeneratedImage(dataUrl);
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `Reforestal_LandDollar_Dynamic_${insertedSlug || 'qr'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-gold" />
            {t('admin.dynamicLinks.title', 'Generador de Land Dollar con QR Dinámico')}
          </CardTitle>
          <CardDescription>
            {t('admin.dynamicLinks.description', 'Crea enlaces dinámicos QR y genera Land Dollars personalizados directamente desde el panel de administración.')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">
                  {t('admin.dynamicLinks.create_qr', '¿Quieres crear un QR dinámico?')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('admin.dynamicLinks.create_qr_desc', 'Activa esta opción para insertar un nuevo enlace dinámico en la base de datos.')}
                </p>
              </div>
              <Switch
                checked={createDynamicQR}
                onCheckedChange={setCreateDynamicQR}
              />
            </div>

            <Separator />

            {createDynamicQR && (
              <div className="space-y-2">
                <Label htmlFor="slug-input">
                  {t('admin.dynamicLinks.slug_label', '¿Qué link dinámico quieres vincular?')}
                </Label>
                <div className="flex items-center gap-0">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm h-10">
                    https://reforest.al/
                  </span>
                  <Input
                    id="slug-input"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder={t('admin.dynamicLinks.slug_placeholder', 'mi-pagina')}
                    className="rounded-l-none flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('admin.dynamicLinks.slug_hint', 'Solo minúsculas, números, guiones y guiones bajos. Se guardará como slug en dynamic_links.')}
                </p>
              </div>
            )}

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">
                  {t('admin.dynamicLinks.print_qr', '¿Quieres que el QR se imprima directamente en el Land Dollar?')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('admin.dynamicLinks.print_qr_desc', 'Superpone el código QR sobre la plantilla base del Land Dollar.')}
                </p>
              </div>
              <Switch
                checked={printQROnLandDollar}
                onCheckedChange={setPrintQROnLandDollar}
              />
            </div>

            <Separator />

            <Button
              onClick={handleGenerate}
              disabled={processing || !createDynamicQR}
              className="w-full bg-gradient-gold text-[#063127] font-bold hover:opacity-90"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('admin.dynamicLinks.processing', 'Procesando...')}
                </>
              ) : (
                <>
                  <QrCode className="mr-2 h-4 w-4" />
                  {t('admin.dynamicLinks.generate', 'Generar Land Dollar')}
                </>
              )}
            </Button>
          </div>

          {generatedImage && (
            <div className="space-y-4">
              <Separator />
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">
                  {t('admin.dynamicLinks.preview_title', 'Vista previa del Land Dollar')}
                </h3>
                <div className="inline-block rounded-lg overflow-hidden border shadow-lg">
                  <img
                    src={generatedImage}
                    alt="Land Dollar Preview"
                    className="max-w-full h-auto"
                  />
                </div>
              </div>

              <Button
                onClick={handleDownload}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Download className="mr-2 h-4 w-4" />
                {t('admin.dynamicLinks.download', 'Descargar Land Dollar')}
              </Button>

              {insertedSlug && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-amber-800 dark:text-amber-200">
                      {t('admin.dynamicLinks.reminder_title', 'Recordatorio importante')}
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      {t('admin.dynamicLinks.reminder_desc', 'Recuerda crear la página/ruta para')}{' '}
                      <code className="font-mono font-bold bg-amber-100 dark:bg-amber-900 px-1 rounded">
                        /{insertedSlug}
                      </code>{' '}
                      {t('admin.dynamicLinks.reminder_desc_end', 'en la web.')}
                    </p>
                  </div>
                </div>
              )}

              {insertedSlug && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                      {t('admin.dynamicLinks.success_title', 'Enlace dinámico creado')}
                    </p>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">
                      {t('admin.dynamicLinks.success_desc', 'El slug')}{' '}
                      <code className="font-mono font-bold bg-emerald-100 dark:bg-emerald-900 px-1 rounded">
                        {insertedSlug}
                      </code>{' '}
                      {t('admin.dynamicLinks.success_desc_end', 'ha sido insertado en dynamic_links y está activo.')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DynamicLinkGenerator;
