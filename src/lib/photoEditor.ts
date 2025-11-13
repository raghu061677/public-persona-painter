/**
 * Photo editing utilities for batch processing
 */

export interface PhotoEditSettings {
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  rotation: number; // 0, 90, 180, 270
}

/**
 * Apply edit settings to an image
 */
export async function editPhoto(
  imageFile: File,
  settings: PhotoEditSettings
): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    const img = new Image();
    img.onload = () => {
      // Handle rotation
      const isRotated = settings.rotation === 90 || settings.rotation === 270;
      canvas.width = isRotated ? img.height : img.width;
      canvas.height = isRotated ? img.width : img.height;

      // Apply rotation
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((settings.rotation * Math.PI) / 180);
      ctx.translate(-img.width / 2, -img.height / 2);

      // Draw image
      ctx.drawImage(img, 0, 0);

      // Apply brightness and contrast
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Convert brightness and contrast from -100/100 to usable values
      const brightness = (settings.brightness / 100) * 255;
      const contrast = (settings.contrast + 100) / 100;

      for (let i = 0; i < data.length; i += 4) {
        // Apply contrast
        data[i] = ((data[i] - 128) * contrast + 128);
        data[i + 1] = ((data[i + 1] - 128) * contrast + 128);
        data[i + 2] = ((data[i + 2] - 128) * contrast + 128);

        // Apply brightness
        data[i] = Math.min(255, Math.max(0, data[i] + brightness));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + brightness));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + brightness));
      }

      ctx.putImageData(imageData, 0, 0);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const editedFile = new File(
              [blob],
              imageFile.name.replace(/\.(jpg|jpeg|png)$/i, '_edited.$1'),
              { type: imageFile.type }
            );
            resolve(editedFile);
          } else {
            reject(new Error('Failed to create edited image'));
          }
        },
        imageFile.type,
        0.95
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(imageFile);
  });
}

/**
 * Apply edit settings to multiple images
 */
export async function editPhotosBatch(
  files: File[],
  settings: PhotoEditSettings,
  onProgress?: (index: number, progress: number) => void
): Promise<File[]> {
  const editedFiles: File[] = [];

  for (let i = 0; i < files.length; i++) {
    if (onProgress) onProgress(i, 0);

    try {
      const editedFile = await editPhoto(files[i], settings);
      editedFiles.push(editedFile);

      if (onProgress) onProgress(i, 100);
    } catch (error) {
      console.error(`Failed to edit ${files[i].name}:`, error);
      // Use original file if editing fails
      editedFiles.push(files[i]);
      if (onProgress) onProgress(i, 100);
    }
  }

  return editedFiles;
}
