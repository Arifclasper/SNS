import { v2 as cloudinary } from "cloudinary";
import { CLOUDINARY_FOLDER } from "./config";

/**
 * Server-only Cloudinary configuration. Uploaded product / colour / hero
 * images live in Cloudinary; MongoDB only stores their public URLs and the
 * `public_id` needed to delete or replace them.
 */
if (process.env.CLOUDINARY_URL) {
  cloudinary.config({ cloudinary_url: process.env.CLOUDINARY_URL, secure: true });
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export type UploadedImage = {
  public_id: string;
  secure_url: string;
  url: string;
  format?: string;
  bytes: number;
  width?: number;
  height?: number;
};

export function uploadImage(
  buffer: Buffer,
  options: { filename?: string; folder?: string } = {},
): Promise<UploadedImage> {
  const folder = options.folder ?? CLOUDINARY_FOLDER;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        use_filename: Boolean(options.filename),
        filename_override: options.filename,
        unique_filename: true,
        overwrite: false,
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed."));
          return;
        }
        resolve({
          public_id: result.public_id,
          secure_url: result.secure_url,
          url: result.url,
          format: result.format,
          bytes: result.bytes,
          width: result.width,
          height: result.height,
        });
      },
    );
    stream.end(buffer);
  });
}

/** Best-effort removal of a Cloudinary asset. */
export async function destroyImage(publicId: string | null | undefined): Promise<void> {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch {
    /* Replaced images must never block a product save. */
  }
}

/** Extracts a Cloudinary public_id from a delivery URL, when possible. */
export function publicIdFromUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!url.hostname.endsWith("cloudinary.com")) return null;
    const marker = "/upload/";
    const index = url.pathname.indexOf(marker);
    if (index === -1) return null;
    let rest = url.pathname.slice(index + marker.length);
    rest = rest.replace(/^v\d+\//, "");
    return rest.replace(/\.[^.]+$/, "") || null;
  } catch {
    return null;
  }
}

export { cloudinary };
