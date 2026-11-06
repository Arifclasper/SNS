import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { uploadImage } from "@/lib/cloudinary";
import { Media } from "@/lib/models";
import { ready } from "@/lib/mongoose";
import {
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_MB,
  UPLOAD_ALLOWED_MIME_TYPES,
} from "@/lib/config";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(UPLOAD_ALLOWED_MIME_TYPES);

function cleanFilename(name: string) {
  const base = name.replace(/[^a-zA-Z0-9._ -]+/g, "").trim().slice(0, 120);
  return base || "image";
}

export async function POST(request: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Could not read the upload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an image file." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Use a JPG, PNG, WebP, GIF or AVIF image." },
      { status: 415 },
    );
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "That file is empty." }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `Pictures must be ${MAX_UPLOAD_MB} MB or smaller.` },
      { status: 413 },
    );
  }

  const filename = cleanFilename(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());

  let uploaded: Awaited<ReturnType<typeof uploadImage>>;
  try {
    uploaded = await uploadImage(buffer, { filename });
  } catch {
    return NextResponse.json(
      { error: "That picture could not be uploaded. Please try again." },
      { status: 502 },
    );
  }

  try {
    await ready();
    const media = await Media.create({
      public_id: uploaded.public_id,
      secure_url: uploaded.secure_url,
      url: uploaded.url,
      resource_type: "image",
      format: uploaded.format ?? null,
      bytes: uploaded.bytes ?? buffer.byteLength,
      width: uploaded.width ?? 0,
      height: uploaded.height ?? 0,
      original_filename: filename,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      id: String(media._id),
      url: uploaded.secure_url,
      filename,
    });
  } catch {
    return NextResponse.json(
      { error: "That picture could not be saved. Please try again." },
      { status: 500 },
    );
  }
}
