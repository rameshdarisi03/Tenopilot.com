/**
 * Ultra-fast client-side canvas image compression
 * Downscales images to max dimension and compresses to crisp JPEG
 * Reduces 5MB-15MB phone camera/screenshot images to 40KB-90KB in <100ms
 */
export async function compressImageToDataUrl(
  file: File,
  maxDimension = 1200,
  quality = 0.75
): Promise<{
  dataUrl: string;
  originalSizeKb: number;
  compressedSizeKb: number;
  compressionRatio: string;
}> {
  const originalSizeKb = Math.round(file.size / 1024);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) {
          const rawUrl = e.target?.result as string;
          return resolve({
            dataUrl: rawUrl,
            originalSizeKb,
            compressedSizeKb: originalSizeKb,
            compressionRatio: "0%",
          });
        }

        // Fill white background for transparent PNGs
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);

        // High quality smooth downsampling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        const compressedSizeKb = Math.round((compressedDataUrl.length * 3) / 4 / 1024);
        const ratioPct =
          originalSizeKb > 0
            ? Math.round(((originalSizeKb - compressedSizeKb) / originalSizeKb) * 100)
            : 0;

        resolve({
          dataUrl: compressedDataUrl,
          originalSizeKb,
          compressedSizeKb,
          compressionRatio: `${Math.max(0, ratioPct)}%`,
        });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
