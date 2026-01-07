/**
 * Image processing utilities
 */

const MAX_SIZE_MB = 3.0;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

/**
 * Compresses an image file if it exceeds the maximum size.
 * Returns a base64 string (Data URL).
 */
export async function compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        // If file is already small enough, just read it as Data URL
        if (file.size <= MAX_SIZE_BYTES) {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
            return;
        }

        // Otherwise, compress it using Canvas
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Scale down if dimensions are massive (sanity check)
                const MAX_DIM = 2048;
                if (width > MAX_DIM || height > MAX_DIM) {
                    if (width > height) {
                        height = (height / width) * MAX_DIM;
                        width = MAX_DIM;
                    } else {
                        width = (width / height) * MAX_DIM;
                        height = MAX_DIM;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                // Recursive quality reduction if still too large
                let quality = 0.95;
                let dataUrl = canvas.toDataURL('image/jpeg', quality);

                // Approximate check for size in base64 (roughly 1.33x the binary size)
                while (dataUrl.length * 0.75 > MAX_SIZE_BYTES && quality > 0.1) {
                    quality -= 0.1;
                    dataUrl = canvas.toDataURL('image/jpeg', quality);
                }

                resolve(dataUrl);
            };
            img.onerror = reject;
            img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
