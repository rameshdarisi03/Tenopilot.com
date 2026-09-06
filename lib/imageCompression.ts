/**
 * Shared Client-Side Image Compression Engine
 * Scales receipt/proof screenshots to max 1280px (crisp UTR & amounts) and 0.85 JPEG quality
 */
export async function compressPaymentScreenshot(
  file: File,
  maxDim: number = 1280,
  quality: number = 0.85
): Promise<{ base64: string; sizeKb: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          const rawBase64 = event.target?.result as string;
          resolve({
            base64: rawBase64,
            sizeKb: Math.round((rawBase64.length * 3) / 4 / 1024),
          });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
        const sizeKb = Math.round((compressedBase64.length * 3) / 4 / 1024);
        resolve({ base64: compressedBase64, sizeKb });
      };
      img.onerror = () => reject(new Error("Unable to parse image for compression."));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });
}
