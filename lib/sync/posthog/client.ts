import { z } from "zod";
import { getEnv } from "@/lib/env";
import { fetchWithRetry } from "@/lib/sync/http";

/**
 * PostHog Cloud US API client (server-side only). Endpoint paths follow the
 * public API; confirm against official docs (docs/architecture/external-apis.md).
 */
const eventSchema = z.object({
  id: z.string(),
  event: z.string(),
  distinct_id: z.string(),
  timestamp: z.string(),
  properties: z.record(z.unknown()).optional().default({}),
});

const eventsResponseSchema = z.object({
  results: z.array(eventSchema),
  next: z.string().nullable().optional(),
});

export type PostHogEvent = z.infer<typeof eventSchema>;

function config() {
  const env = getEnv();
  if (!env.POSTHOG_API_KEY || !env.POSTHOG_PROJECT_ID) {
    throw new Error("PostHog credentials missing (POSTHOG_API_KEY / POSTHOG_PROJECT_ID)");
  }
  return {
    baseUrl: env.POSTHOG_BASE_URL,
    apiKey: env.POSTHOG_API_KEY,
    projectId: env.POSTHOG_PROJECT_ID,
  };
}

/**
 * Fetch one page of events. `after` is an ISO timestamp cursor; `next` is a
 * full pagination URL returned by the API.
 */
export async function fetchEventsPage(params: {
  after?: string | null;
  next?: string | null;
}): Promise<{ events: PostHogEvent[]; next: string | null }> {
  const { baseUrl, apiKey, projectId } = config();

  const url =
    params.next ??
    `${baseUrl}/api/projects/${projectId}/events/?` +
      new URLSearchParams({
        ...(params.after ? { after: params.after } : {}),
        limit: "100",
      }).toString();

  const res = await fetchWithRetry(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    throw new Error(`PostHog events request failed: ${res.status} ${res.statusText}`);
  }

  const parsed = eventsResponseSchema.parse(await res.json());
  return { events: parsed.results, next: parsed.next ?? null };
}
