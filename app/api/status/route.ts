import { authorizeRequest } from "@/lib/auth";
import { getStatusPayload } from "@/lib/status";
import { getConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	if (!authorizeRequest(request)) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { snapshot, incidents } = await getStatusPayload();
	const config = getConfig();

	return Response.json({
		...snapshot,
		incidents,
		meta: {
			title: config.MONITOR_TITLE,
			tagline: config.MONITOR_TAGLINE,
			pollIntervalMs: config.POLL_INTERVAL_MS,
			publicUrl: config.MONITOR_PUBLIC_URL,
		},
	});
}
