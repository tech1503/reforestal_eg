import QRCode from 'qrcode';

/**
 * Generates a Land Dollar image using native Canvas API with an integrated QR code.
 * Used for downloading the final certificate/asset.
 * * @param {string} linkRef - The unique reference code for the QR (e.g. from Profile or LandDollar table).
 * @returns {Promise<string>} - A base64 string (Data URL) of the generated PNG.
 */
export const generateLandDollarWithQR = async (linkRef) => {
  // 1. IMAGEN BASE PROPORCIONADA
  const BASE_IMAGE_URL = 'https://horizons-cdn.hostinger.com/f3e64aa8-a860-4738-bd1d-a8274113afae/2116fe756f7ac15863002883077a83a3.png';
  
  // Configuración de tamaño
  // Ajustamos el tamaño del QR para que sea legible pero estético dentro del billete
  const QR_SIZE = 180; 
  
  // Margen derecho para ubicarlo en la zona "derecha" (Center Right)
  const MARGIN_RIGHT = 100; 

  try {
    // 2. Cargar Imagen Base
    const img = new Image();
    img.crossOrigin = "anonymous"; // Necesario para evitar problemas de CORS al exportar canvas
    img.src = BASE_IMAGE_URL;
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = (e) => reject(new Error(`Failed to load base image: ${e.message}`));
    });

    // 3. Crear Canvas del tamaño exacto del billete
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');

    // 4. Dibujar el Billete (Fondo)
    ctx.drawImage(img, 0, 0);

    // 5. Generar el QR
    // URL solicitada: https://reforest.al/[CODIGO]
    const qrUrl = `https://reforest.al/${linkRef}`;
    
    // Generamos el QR en memoria con fondo transparente y color verde oscuro
    const qrDataUrl = await QRCode.toDataURL(qrUrl, {
      errorCorrectionLevel: 'H', // Alta corrección para que sea escaneable con logo o distorsión
      type: 'image/png',
      margin: 0,
      color: {
        dark: '#064e3b', // Emerald-900 (Verde muy oscuro para contraste y estética)
        light: '#00000000' // Transparente
      },
      width: QR_SIZE
    });

    const qrImg = new Image();
    qrImg.src = qrDataUrl;
    await new Promise((resolve) => { qrImg.onload = resolve; });

    // 6. Calcular Posición (Centro - Derecha)
    // X: Ancho total - Tamaño QR - Margen Derecho
    const x = canvas.width - QR_SIZE - MARGIN_RIGHT;
    // Y: Centrado verticalmente ((Alto total - Alto QR) / 2)
    const y = (canvas.height - QR_SIZE) / 2;

    // 7. Dibujar QR sobre el billete
    // Usamos 'multiply' para que el QR parezca impreso en el papel (tinta) en vez de una pegatina encima
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(qrImg, x, y, QR_SIZE, QR_SIZE);
    
    // Restaurar modo de dibujo normal
    ctx.globalCompositeOperation = 'source-over';

    // 8. Retornar imagen final en Base64
    return canvas.toDataURL('image/png');

  } catch (err) {
    console.error('LandDollar generation error:', err);
    throw err;
  }
};

/**
 * Helper para descargar la imagen generada automáticamente.
 */
export const downloadLandDollar = (dataUrl, filename = 'Reforestal_LandDollar.png') => {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};