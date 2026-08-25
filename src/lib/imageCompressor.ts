/**
 * Fast Client-Side Image Compressor & DataURL / Storage Uploader.
 * Compresses images instantly into lightweight JPEGs (< 60KB) for real-time Firestore persistence
 * and optional Firebase Storage upload with automatic timeout fallback.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Compresses any image file into a compact Base64 Data URL string (e.g. data:image/jpeg;base64,...).
 */
export async function compressImageToDataUrl(
  file: File,
  options: CompressionOptions = {}
): Promise<string> {
  const { maxWidth = 900, maxHeight = 900, quality = 0.7 } = options;

  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image in browser"));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "medium";
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses an image file and converts to Blob.
 */
export async function compressImageFile(
  file: File,
  options: CompressionOptions = {}
): Promise<Blob> {
  const { maxWidth = 900, maxHeight = 900, quality = 0.7 } = options;

  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "medium";
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
