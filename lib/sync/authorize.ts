import { getEnv } from "@/lib/env";

/**
 * Authorize a sync request.
 *  - If CRON_SECRET is NOT configured, the endpoint is open (no secret required).
 *  - If CRON_SECRET IS configured, the request must present it via either:
 *      Authorization: Bearer <CRON_SECRET>   (Vercel Cron sets this header)
 *      x-cron-secret: <CRON_SECRET>
 */
export function isAuthorizedSync(req: Request): boolean {
  const { CRON_SECRET } = getEnv();
  if (!CRON_SECRET) return true; // open when not configured

  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${CRON_SECRET}`) return true;

  const header = req.headers.get("x-cron-secret");
  return header === CRON_SECRET;
}
