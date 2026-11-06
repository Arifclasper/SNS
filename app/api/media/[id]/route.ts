import { NextResponse } from "next/server";
import { Media, isObjectId } from "@/lib/models";
import { ready } from "@/lib/mongoose";

export const dynamic = "force-dynamic";

/*
 * Legacy media links (`/api/media/<oldId>`) now live in Cloudinary. This route
 * only resolves the stored asset and redirects to its secure URL; it no longer
 * streams bytes out of MongoDB.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isObjectId(id)) {
    return new Response("Not found", { status: 404 });
  }

  await ready();
  const media = await Media.findById(id).lean();
  if (!media) return new Response("Not found", { status: 404 });

  return NextResponse.redirect(media.secure_url, 308);
}
