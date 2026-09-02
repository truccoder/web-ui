/**
 * Turn an image file plus a crop rectangle into a new file, entirely in the browser.
 *
 * WHY THE CROP HAPPENS CLIENT-SIDE. `POST /v1/api/media` stores whatever bytes it is handed — it
 * has no crop parameter, and the avatar endpoint (`PUT /profile/picture`) has none either. An
 * avatar and a cover are the two images in the product with a fixed frame, so the alternative to
 * cropping here is letting the reader upload a portrait photo that the CSS then centre-crops on
 * every surface it appears — a face cut off differently in the hero, the rail and a comment row.
 *
 * `react-easy-crop` reports the selected area in the SOURCE image's natural pixels
 * (`croppedAreaPixels`); this paints exactly that rectangle onto a canvas at 1:1 and reads it back
 * out. No upscaling — the output is never larger than the pixels the reader actually selected.
 */
export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => reject(new Error('image decode failed')));
    image.src = src;
  });
}

/**
 * `type` and `name` come from the source file so the result stays inside
 * `ACCEPTED_MEDIA_TYPES` — a JPEG in, a JPEG out. GIF is filtered out by the callers that use
 * crop mode (avatar, cover), so animation is never a concern here.
 */
export async function cropImageFile(file: File, crop: PixelCrop): Promise<File> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(crop.width);
    canvas.height = Math.round(crop.height);

    const context = canvas.getContext('2d');
    if (!context) throw new Error('canvas 2d context unavailable');

    context.drawImage(
      image,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      crop.width,
      crop.height
    );

    const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outputType, 0.92)
    );
    if (!blob) throw new Error('canvas export failed');

    return new File([blob], file.name, { type: outputType, lastModified: Date.now() });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
