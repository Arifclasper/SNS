/**
 * Order codes follow SNS-YYMMDD-0001, e.g. the first order on 5 November 2026
 * is SNS-261105-0001, the second SNS-261105-0002.
 *
 * Every component is zero-padded so two different dates can never produce the
 * same code (the previous unpadded day+month format collided: 11 Jan and
 * 1 Nov both became SNS-111261).
 *
 * The daily counter resets at midnight in the store's timezone, which is
 * deliberately not the server timezone: Vercel runs in UTC and would otherwise
 * roll over at 6 AM in Dhaka.
 */
import { STORE_TIME_ZONE } from "./utils";
import { ORDER_CODE_PREFIX, STORE_ISO_LOCALE } from "./config";

export { STORE_TIME_ZONE };

function partsInStoreZone(date: Date) {
  const parts = new Intl.DateTimeFormat(STORE_ISO_LOCALE, {
    timeZone: STORE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { year: read("year"), month: read("month"), day: read("day") };
}

/** YYYY-MM-DD in the store timezone — the key for the daily counter. */
export function storeDayKey(date: Date = new Date()) {
  const { year, month, day } = partsInStoreZone(date);
  return `${year}-${month}-${day}`;
}

/** SNS-261105-0001 for the first order on 5 Nov 2026. */
export function buildOrderCode(date: Date, sequence: number) {
  const { year, month, day } = partsInStoreZone(date);
  const shortYear = year.slice(-2);
  const counter = Math.max(1, Math.trunc(sequence));
  return `${ORDER_CODE_PREFIX}-${shortYear}${month}${day}-${String(counter).padStart(4, "0")}`;
}
