import QRCode from 'qrcode';
import landDollarBaseImg from '@/assets/land-dollar-base.webp';

export const generateLandDollarWithQR = async (linkRef) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = landDollarBaseImg;

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = (e) => reject(new Error(`Error cargando imagen base.`));
    });

    const MAX_WIDTH = 1920; 
    let targetWidth = img.width;
    let targetHeight = img.height;

    if (targetWidth > MAX_WIDTH) {
        const ratio = MAX_WIDTH / targetWidth;
        targetWidth = MAX_WIDTH;
        targetHeight = img.height * ratio;
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const qrUrl = `https://reforest.al/${linkRef}`;
    
    const qrDataUrl = await QRCode.toDataURL(qrUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 1,
      color: { dark: '#1A4231', light: '#FFFFFF' }
    });

    const qrImg = new Image();
    qrImg.src = qrDataUrl;
    await new Promise((resolve) => { qrImg.onload = resolve; });

    const qrSize = targetWidth * 0.11;
    const qrX = targetWidth - qrSize - (targetWidth * 0.18);
    const qrY = (targetHeight - qrSize) / 2;

    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

    const fontSize = Math.floor(targetWidth * 0.012);
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.fillStyle = '#1A4231';
    
    ctx.fillText(`${linkRef.toUpperCase()}`, qrX, qrY + qrSize + fontSize);

    return new Promise(resolve => {
        canvas.toBlob((blob) => {
            resolve(blob);
        }, 'image/jpeg', 0.9); 
    });

  } catch (error) {
    console.error("Error en QR Renderer:", error);
    throw error;
  }
};