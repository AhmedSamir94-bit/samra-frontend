/** Compress an image File to a JPEG data URL suitable for API storage. */
export async function fileToProductImageDataUrl(
  file: File,
  options?: { maxWidth?: number; quality?: number; maxBytes?: number },
): Promise<string> {
  const maxWidth = options?.maxWidth ?? 800;
  const quality = options?.quality ?? 0.72;
  const maxBytes = options?.maxBytes ?? 900_000;

  if (!file.type.startsWith("image/")) {
    throw new Error("الملف المحدد ليس صورة");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const scale = Math.min(1, maxWidth / Math.max(img.width, 1));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("تعذر معالجة الصورة");
    ctx.drawImage(img, 0, 0, width, height);

    let q = quality;
    let dataUrl = canvas.toDataURL("image/jpeg", q);
    while (dataUrl.length > maxBytes && q > 0.4) {
      q -= 0.08;
      dataUrl = canvas.toDataURL("image/jpeg", q);
    }

    if (dataUrl.length > maxBytes) {
      throw new Error("الصورة كبيرة جداً بعد الضغط — اختر صورة أصغر");
    }

    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("تعذر قراءة الصورة"));
    img.src = src;
  });
}
