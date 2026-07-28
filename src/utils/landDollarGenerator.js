import QRCode from 'qrcode';
import landDollarBaseImg from '@/assets/land-dollar-base1.webp';

/**
 * Generates a Land Dollar image using native Canvas API with an integrated QR code.
 * Single source of truth for Land Dollar generation.
 *
 * @param {string} linkRef - The unique reference code for the QR
 * @param {object} [options] - Generation options
 * @param {'blob'|'data-url'} [options.format='data-url'] - Output format
 * @returns {Promise<string|Blob>} - PNG as data URL string or Blob
 */
export const generateLandDollarWithQR = async (linkRef, options = {}) => {
  const { format = 'data-url' } = options;
  const QR_SIZE = 180;
  const MARGIN_RIGHT = 100;
  const MAX_WIDTH = 1920;

  try {
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
    const qrDataUrl = await QRCode.toDataURL(qrUrl, {
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

    if (format === 'blob') {
      return new Promise(resolve => {
        canvas.toBlob(blob => resolve(blob), 'image/png', 0.95);
      });
    }

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('LandDollar generation error:', err);
    throw err;
  }
};

/**
 * Downloads a Land Dollar image.
 * @param {string|Blob} dataUrlOrBlob - Data URL or Blob of the image
 * @param {string} filename - Output filename
 */
export const downloadLandDollar = (dataUrlOrBlob, filename = 'Reforestal_LandDollar.png') => {
  const url = dataUrlOrBlob instanceof Blob
    ? URL.createObjectURL(dataUrlOrBlob)
    : dataUrlOrBlob;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  if (url.startsWith('blob:')) {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
};
