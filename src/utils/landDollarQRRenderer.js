import QRCode from 'qrcode';

/**
 * Generates the final Land Dollar PNG.
 * PRODUCTION VERSION: Uses local asset to avoid CORS and Proxy issues.
 */
export const generateLandDollarWithQR = async (linkRef) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // RUTA LOCAL EN PRODUCCIÓN (Asegúrate de subir la imagen a public/assets/)
  const BASE_IMAGE_URL = '/assets/land-dollar-base.png';

  try {
    const img = new Image();
    // En producción (mismo dominio), crossOrigin no suele ser necesario, pero es buena práctica dejarlo si usas CDN propio.
    img.crossOrigin = "anonymous";
    img.src = BASE_IMAGE_URL;

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = (e) => reject(new Error('Failed to load local Land Dollar image. Check public/assets folder.'));
    });

    canvas.width = img.width;
    canvas.height = img.height;

    // Dibujar fondo
    ctx.drawImage(img, 0, 0);

    // Generar QR
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

    // Posicionar QR (Centro-Derecha)
    const qrSize = canvas.width * 0.11;
    const qrX = canvas.width - qrSize - (canvas.width * 0.18);
    const qrY = (canvas.height - qrSize) / 2;

    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

    // Texto Ref
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