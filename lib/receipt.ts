import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import { formatDateTime, ORDER_STATUS_LABEL } from "./utils";
import {
  CURRENCY_ASCII_FALLBACK,
  CURRENCY_SYMBOL,
  STORE_NAME,
  STORE_NUMBER_LOCALE,
} from "./config";
import type { Order, OrderItem } from "./types";

/**
 * Shared PDF receipt renderer used by both the public token route and the
 * authenticated admin route.
 */

const FONT_DIR = path.join(process.cwd(), "assets", "fonts");

function fontPath(file: string) {
  const full = path.join(FONT_DIR, file);
  return fs.existsSync(full) ? full : null;
}

function makeMoney(currency: string) {
  return (amount: number) => {
    const rounded = Math.round(amount * 100) / 100;
    return (
      currency +
      rounded.toLocaleString(STORE_NUMBER_LOCALE, {
        minimumFractionDigits: Number.isInteger(rounded) ? 0 : 2,
        maximumFractionDigits: 2,
      })
    );
  };
}

export async function renderOrderReceipt({
  order,
  items,
  settings,
}: {
  order: Order;
  items: OrderItem[];
  settings: Record<string, string>;
}): Promise<Buffer> {
  const regular = fontPath("HindSiliguri-Regular.ttf");
  const medium = fontPath("HindSiliguri-Medium.ttf");
  const bold = fontPath("HindSiliguri-Bold.ttf");
  const unicode = Boolean(regular && bold);

  // "৳" is not in the PDF core fonts. Without the bundled Hindi/Bengali-capable
  // face the receipt falls back to an ASCII label rather than a broken glyph.
  const currency = unicode
    ? settings.currency || CURRENCY_SYMBOL
    : CURRENCY_ASCII_FALLBACK;
  const money = makeMoney(currency);

  let cleanup: PDFKit.PDFDocument | null = null;

  try {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: `Receipt ${order.code}`,
        Author: settings.store_name || STORE_NAME,
        Subject: `Order ${order.code}`,
      },
    });
    cleanup = doc;

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    const finished = new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });

    if (unicode) {
      doc.registerFont("body", regular!);
      doc.registerFont("medium", medium ?? regular!);
      doc.registerFont("bold", bold!);
    }
    const body = unicode ? "body" : "Helvetica";
    const strong = unicode ? "bold" : "Helvetica-Bold";

    const ink = "#2b1622";
    const muted = "#7b5b6b";
    const line = "#e7c3d5";
    const brand = "#c22f68";
    const pageWidth = doc.page.width;
    const left = 50;
    const right = pageWidth - 50;
    const storeName = settings.store_name || STORE_NAME;

    /* ------------------------------ header ------------------------------ */

    doc.font(strong).fontSize(20).fillColor(ink).text(storeName, left, 50);
    doc
      .font(body)
      .fontSize(9)
      .fillColor(muted)
      .text("Sales receipt · cash on delivery", left, 76);

    doc
      .font(strong)
      .fontSize(16)
      .fillColor(brand)
      .text(order.code, left, 50, { width: right - left, align: "right" });
    doc
      .font(body)
      .fontSize(9)
      .fillColor(muted)
      .text(formatDateTime(order.created_at), left, 74, { width: right - left, align: "right" });

    doc.moveTo(left, 104).lineTo(right, 104).lineWidth(1).strokeColor(line).stroke();

    /* --------------------------- customer block -------------------------- */

    const detailTop = 122;
    const columnWidth = 240;

    doc.font(strong).fontSize(8).fillColor(muted).text("DELIVER TO", left, detailTop);
    doc.font(strong).fontSize(11).fillColor(ink).text(order.customer_name, left, detailTop + 16);
    doc
      .font(body)
      .fontSize(10)
      .fillColor(ink)
      .text(order.address, left, detailTop + 34, { width: columnWidth });
    if (order.city) {
      doc.font(body).fontSize(10).fillColor(ink).text(order.city, { width: columnWidth });
    }
    doc.font(body).fontSize(10).fillColor(ink).text(order.phone, { width: columnWidth });

    const metaX = left + 300;
    doc.font(strong).fontSize(8).fillColor(muted).text("ORDER", metaX, detailTop);
    doc.font(body).fontSize(10).fillColor(ink);
    doc.text(`Placed: ${formatDateTime(order.created_at)}`, metaX, detailTop + 16, {
      width: right - metaX,
    });
    doc.text(`Status: ${ORDER_STATUS_LABEL[order.status] ?? order.status}`, { width: right - metaX });
    doc.text("Payment: cash on delivery", { width: right - metaX });

    /* ----------------------------- items table --------------------------- */

    let y = 224;
    const colItem = left;
    const colVariant = left + 265;
    const colQty = left + 350;
    const colUnit = left + 390;
    const colTotal = right;

    doc.font(strong).fontSize(8).fillColor(muted);
    doc.text("ITEM", colItem, y);
    doc.text("VARIANT", colVariant, y, { width: 85, align: "center" });
    doc.text("QTY", colQty, y, { width: 35, align: "right" });
    doc.text("UNIT", colUnit, y, { width: 55, align: "right" });
    doc.text("TOTAL", colTotal - 70, y, { width: 70, align: "right" });

    y += 14;
    doc.moveTo(left, y).lineTo(right, y).strokeColor(line).stroke();
    y += 10;

    for (const item of items) {
      if (y > 680) {
        doc.addPage();
        y = 60;
      }

      doc.font(strong).fontSize(10).fillColor(ink).text(item.name, colItem, y, {
        width: 250,
        ellipsis: true,
        lineBreak: false,
      });
      doc.font(body).fontSize(9).fillColor(muted).text(item.sku ?? "", colItem, y + 13, {
        width: 250,
        ellipsis: true,
        lineBreak: false,
      });

      const variant =
        [item.color, item.size].filter((part) => Boolean(part)).join(" / ") || "—";

      doc.font(body).fontSize(9).fillColor(ink);
      doc.text(variant, colVariant, y, { width: 85, align: "center", lineBreak: false });
      doc.text(String(item.qty), colQty, y, { width: 35, align: "right" });
      doc.text(money(item.unit_price), colUnit, y, { width: 55, align: "right" });
      doc.text(money(item.unit_price * item.qty), colTotal - 70, y, { width: 70, align: "right" });

      y += 34;
      doc.moveTo(left, y - 8).lineTo(right, y - 8).strokeColor("#eeeeee").stroke();
    }

    /* ------------------------------- totals ------------------------------ */

    y += 6;
    const totalsLabelX = right - 220;
    const totalsValueX = right - 110;

    const totalRow = (label: string, value: string, options?: { bold?: boolean; accent?: boolean }) => {
      doc
        .font(options?.bold ? strong : body)
        .fontSize(options?.bold ? 12 : 10)
        .fillColor(options?.accent ? brand : options?.bold ? ink : muted)
        .text(label, totalsLabelX, y, { width: 100, align: "right" });
      doc
        .font(options?.bold ? strong : body)
        .fontSize(options?.bold ? 12 : 10)
        .fillColor(ink)
        .text(value, totalsValueX, y, { width: right - totalsValueX, align: "right" });
      y += options?.bold ? 20 : 16;
    };

    totalRow("Subtotal", money(order.subtotal));
    totalRow("Tax", "included");
    totalRow("Delivery", order.shipping === 0 ? "Free" : money(order.shipping));

    doc.moveTo(totalsLabelX - 10, y - 4).lineTo(right, y - 4).strokeColor(line).stroke();
    y += 6;
    totalRow("TOTAL", money(order.total), { bold: true, accent: true });

    /* ------------------------------ tracking ----------------------------- */

    if (order.tracking_id || order.courier) {
      y += 14;
      const boxHeight = 52;
      doc
        .roundedRect(left, y, right - left, boxHeight, 4)
        .lineWidth(1)
        .strokeColor(brand)
        .stroke();

      doc.font(strong).fontSize(8).fillColor(brand).text("DELIVERY / FAST TRACK", left + 12, y + 10);
      doc.font(body).fontSize(10).fillColor(ink);
      const parts = [
        order.courier ? `Courier: ${order.courier}` : null,
        order.tracking_id ? `Tracking ID: ${order.tracking_id}` : null,
      ].filter(Boolean);
      doc.text(parts.join("     ·     "), left + 12, y + 24, { width: right - left - 24 });
      y += boxHeight + 10;
    }

    /* ------------------------------- footer ------------------------------ */

    const footerY = doc.page.height - 80;
    doc
      .font(body)
      .fontSize(9)
      .fillColor(muted)
      .text(
        `Thank you for shopping with ${storeName}. Keep this receipt — it is your proof of purchase.`,
        left,
        footerY,
        { width: right - left, align: "center" },
      );
    doc
      .fontSize(8)
      .text(
        "Cash on delivery · Orders are confirmed by phone before dispatch.",
        left,
        footerY + 16,
        { width: right - left, align: "center" },
      );

    doc.end();

    return await finished;
  } catch (error) {
    try {
      cleanup?.destroy();
    } catch {
      /* ignore cleanup errors */
    }
    throw error;
  }
}
