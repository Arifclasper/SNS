import { getOrderByToken, getOrderItems, getSettings } from "@/lib/queries";
import { renderOrderReceipt } from "@/lib/receipt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const inline = new URL(request.url).searchParams.get("inline") === "1";

  const order = await getOrderByToken(token);
  if (!order) {
    return new Response("Receipt not found", { status: 404 });
  }

  const items = await getOrderItems(order.id);
  const settings = await getSettings();

  try {
    const pdf = await renderOrderReceipt({ order, items, settings });

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${order.code}.pdf"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Could not generate receipt", error);
    return new Response("Could not generate receipt", { status: 500 });
  }
}
