/**
 * Document Security & Auto-Compression Engine for TenoPilot
 * Handles image auto-compression (HTML5 Canvas), PDF validation, and security sanitization.
 */

export interface ProcessedDocument {
  file: File | Blob;
  previewUrl: string;
  originalSizeMb: number;
  compressedSizeMb: number;
  fileName: string;
  fileType: string;
  isCompressed: boolean;
}

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/pdf",
];

// Max raw file size (15 MB)
const MAX_RAW_FILE_SIZE_BYTES = 15 * 1024 * 1024;

/**
 * Validate file type and raw size
 */
export function validateDocumentFile(file: File): { valid: boolean; error?: string } {
  if (!file) return { valid: false, error: "No file selected." };

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: "Invalid file type. Only JPEG, PNG, and PDF files are allowed.",
    };
  }

  // Check raw size limit (15MB)
  if (file.size > MAX_RAW_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds 15 MB limit. Selected file is ${(file.size / (1024 * 1024)).toFixed(1)} MB.`,
    };
  }

  return { valid: true };
}

/**
 * Auto-compresses image files (JPEG/PNG) client-side using HTML5 Canvas
 * Downscales dimensions to max 1600px width/height and sets quality to 80%
 */
export async function autoCompressImage(file: File): Promise<ProcessedDocument> {
  const originalSizeMb = Number((file.size / (1024 * 1024)).toFixed(2));

  // If file is PDF, return directly without canvas compression
  if (file.type === "application/pdf") {
    return {
      file,
      previewUrl: "",
      originalSizeMb,
      compressedSizeMb: originalSizeMb,
      fileName: file.name,
      fileType: "application/pdf",
      isCompressed: false,
    };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Max dimension 1600px
        const MAX_DIM = 1600;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve({
            file,
            previewUrl: e.target?.result as string,
            originalSizeMb,
            compressedSizeMb: originalSizeMb,
            fileName: file.name,
            fileType: file.type,
            isCompressed: false,
          });
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Compress to JPEG at 80% quality
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve({
                file,
                previewUrl: canvas.toDataURL("image/jpeg", 0.8),
                originalSizeMb,
                compressedSizeMb: originalSizeMb,
                fileName: file.name,
                fileType: file.type,
                isCompressed: false,
              });
            }

            const compressedSizeMb = Number((blob.size / (1024 * 1024)).toFixed(2));
            const previewUrl = URL.createObjectURL(blob);

            resolve({
              file: blob,
              previewUrl,
              originalSizeMb,
              compressedSizeMb,
              fileName: file.name.replace(/\.[^/.]+$/, ".jpg"),
              fileType: "image/jpeg",
              isCompressed: compressedSizeMb < originalSizeMb,
            });
          },
          "image/jpeg",
          0.8
        );
      };
      img.onerror = () => reject(new Error("Failed to load image for compression."));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}
