/**
 * Client-Side Image Compression Utility
 * Prevents HTTP 413 (Payload Too Large) by downsizing high-res camera captures (e.g. iPhone 12MP/48MP)
 * down to max 1280px with optimized JPEG compression (~200KB - 400KB per image).
 */

export async function compressImage(fileOrBlob, maxWidth = 1280, maxHeight = 1280, quality = 0.75) {
  if (!fileOrBlob) return { blob: null, preview: null };

  // If not an image (or unsupported), return as-is
  if (fileOrBlob.type && !fileOrBlob.type.startsWith('image/')) {
    return { blob: fileOrBlob, preview: null };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // White background for transparent PNGs converted to JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (compressedBlob) => {
            const finalBlob = compressedBlob || fileOrBlob;
            const preview = canvas.toDataURL('image/jpeg', quality);
            resolve({ blob: finalBlob, preview });
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => {
        resolve({ blob: fileOrBlob, preview: dataUrl });
      };

      img.src = dataUrl;
    };

    reader.onerror = () => {
      resolve({ blob: fileOrBlob, preview: null });
    };

    reader.readAsDataURL(fileOrBlob);
  });
}
