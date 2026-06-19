import { authorizeRequest } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { visibleComponents } from "@/lib/probes";
import { getStatusPayload } from "@/lib/status";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	if (!authorizeRequest(request)) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { snapshot, incidents } = await getStatusPayload();
	const config = getConfig();

	return Response.json({
		...snapshot,
		components: visibleComponents(snapshot.components),
		incidents,
		meta: {
			title: config.MONITOR_TITLE,
			tagline: config.MONITOR_TAGLINE,
			pollIntervalMs: config.POLL_INTERVAL_MS,
			publicUrl: config.MONITOR_PUBLIC_URL,
		},
	});
}
