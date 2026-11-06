/** Uploads a picture picked from the admin's device. Runs in the browser. */

import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB, UPLOAD_ACCEPT } from "./config";

export { MAX_UPLOAD_BYTES };

export type UploadedImage = {
  id?: string;
  url: string;
  filename: string;
};

export const IMAGE_ACCEPT = UPLOAD_ACCEPT;

/**
 * Large camera photos are downscaled in the browser before they are uploaded.
 * That keeps them under the 4 MB server (and Vercel) request limit without
 * asking the owner to resize anything herself.
 */
async function shrinkForUpload(file: File): Promise<File> {
  if (file.size <= 1.5 * 1024 * 1024) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const largest = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, 2000 / Math.max(1, largest));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close?.();
      return file;
    }

    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.85);
    });

    if (!blob || blob.size >= file.size) return file;

    const name = `${file.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`;
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    // Some formats (or older browsers) cannot be decoded here. The original
    // file is still sent and the server decides whether it is acceptable.
    return file;
  }
}

export async function uploadImageFile(file: File): Promise<UploadedImage> {
  const prepared = await shrinkForUpload(file);

  if (prepared.size > MAX_UPLOAD_BYTES) {
    throw new Error(
      `That photo is still larger than ${MAX_UPLOAD_MB} MB. Please choose a smaller picture.`,
    );
  }

  const body = new FormData();
  body.append("file", prepared);

  const response = await fetch("/api/admin/media", { method: "POST", body });
  const result = (await response.json().catch(() => ({}))) as {
    id?: string;
    url?: string;
    filename?: string;
    error?: string;
  };

  if (!response.ok || !result.url) {
    throw new Error(result.error || "Upload failed. Try again.");
  }

  return { id: result.id, url: result.url, filename: result.filename || prepared.name };
}
