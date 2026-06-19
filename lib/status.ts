import { aggregateOverall, runAllProbes } from "@/lib/probes";
import { getIncidents, recordSnapshot } from "@/lib/state";
import { sendSlackIncidentAlert, sendSlackStatusAlert } from "@/lib/slack";
import type { IncidentEvent, StatusSnapshot } from "@/lib/types";

export async function collectStatus(): Promise<StatusSnapshot> {
	const components = await runAllProbes();
	const overall = aggregateOverall(components);
	return {
		overall,
		components,
		checkedAt: new Date().toISOString(),
	};
}

export async function collectStatusWithAlerts(): Promise<{
	snapshot: StatusSnapshot;
	incidents: IncidentEvent[];
	slackSent: boolean;
}> {
	const snapshot = await collectStatus();
	const incidents = recordSnapshot(snapshot);

	let slackSent = false;
	if (incidents.length > 0) {
		slackSent = await sendSlackIncidentAlert(incidents);
		if (
			!slackSent &&
			(snapshot.overall === "down" || snapshot.overall === "degraded")
		) {
			slackSent = await sendSlackStatusAlert(
				snapshot.overall,
				snapshot.components,
			);
		}
	}

	return { snapshot, incidents, slackSent };
}

export async function getStatusPayload(): Promise<{
	snapshot: StatusSnapshot;
	incidents: IncidentEvent[];
}> {
	const snapshot = await collectStatus();
	recordSnapshot(snapshot);
	const incidents = getIncidents();
	return { snapshot, incidents };
}
