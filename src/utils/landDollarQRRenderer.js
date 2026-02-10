import QRCode from 'qrcode';

export const generateLandDollarWithQR = async (linkRef) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const BASE_IMAGE_URL = '/assets/land-dollar-base.png';

  try {
    const img = new Image();

    img.crossOrigin = "anonymous";
    img.src = BASE_IMAGE_URL;

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = (e) => reject(new Error(`Failed to load local Land Dollar image. Event: ${e.type}`));
    });

    canvas.width = img.width;
    canvas.height = img.height;

    ctx.drawImage(img, 0, 0);

    const qrUrl = `https://reforest.al/ref/${linkRef}`;
    const qrDataUrl = await QRCode.toDataURL(qrUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 1,
      color: { dark: '#1A4231', light: '#FFFFFF' }
    });

    const qrImg = new Image();
    qrImg.src = qrDataUrl;
    await new Promise((resolve) => { qrImg.onload = resolve; });

    const qrSize = canvas.width * 0.11;
    const qrX = canvas.width - qrSize - (canvas.width * 0.18);
    const qrY = (canvas.height - qrSize) / 2;

    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

    const fontSize = Math.floor(canvas.width * 0.012);
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.fillStyle = '#1A4231';
    ctx.textAlign = 'center';
    ctx.fillText(linkRef, qrX + (qrSize / 2), qrY + qrSize + (fontSize * 1.5));

    return new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1.0));

  } catch (error) {
    console.error("Failed to render Land Dollar QR:", error);
    throw error;
  }
};