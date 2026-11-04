// Client-side photo preparation: centre-crop to a square, shrink to 512 px, re-encode as JPEG.
// This keeps uploads small on weak mobile networks and drops EXIF data such as GPS location.
export async function prepareProfilePhoto(file: File, size = 512): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("not an image");

  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = Math.min(size, side);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side,
    0, 0, canvas.width, canvas.height,
  );
  bitmap.close();

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("encoding failed"))), "image/jpeg", 0.85),
  );
}
