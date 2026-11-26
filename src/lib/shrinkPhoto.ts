// Makes a camera photo small enough to send before it leaves the phone. A newer
// phone's photo is often 3 to 8 MB, so a handful sent together went over the
// upload limit (see next.config.ts), and each one is slow on mobile data. At
// 2,000 pixels on the long side a photo is typically under 1 MB and still shows
// the detail of a room. Runs in the browser only.
const LONG_SIDE = 2000;
const QUALITY = 0.82;
// Not worth redoing below this.
const SMALL_ENOUGH = 700 * 1024;

export async function shrinkPhoto(file: File): Promise<File> {
  if (file.size <= SMALL_ENOUGH) return file;
  try {
    // Turned the right way up, as the camera recorded it.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, LONG_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) return file;
    // A JPEG has no see-through parts, so they would otherwise turn black.
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, "image/jpeg", QUALITY));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.[^.]*$/, "")}.jpg`, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } catch {
    // A format this browser cannot read: send it as it is.
    return file;
  }
}
