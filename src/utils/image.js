// Read an image file and shrink it so it fits comfortably in localStorage.
export function readImageFile(file, maxWidth = 1400, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) { reject(new Error('Please choose an image file (JPG, PNG or WebP).')); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read this file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not open this image.'));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
