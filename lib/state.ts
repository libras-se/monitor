import type { CheckStatus, IncidentEvent, StatusSnapshot } from "@/lib/types";

interface RuntimeState {
	lastSnapshot: StatusSnapshot | null;
	incidents: IncidentEvent[];
	componentStatus: Record<string, CheckStatus>;
}

const state: RuntimeState = {
	lastSnapshot: null,
	incidents: [],
	componentStatus: {},
};

export function getIncidents(limit = 30): IncidentEvent[] {
	return state.incidents.slice(0, limit);
}

export function recordSnapshot(snapshot: StatusSnapshot): IncidentEvent[] {
	const newIncidents: IncidentEvent[] = [];

	for (const component of snapshot.components) {
		if (component.status === "disabled") continue;
		const prev = state.componentStatus[component.id];
		if (prev && prev !== component.status) {
			const incident: IncidentEvent = {
				id: `${component.id}-${Date.now()}`,
				at: snapshot.checkedAt,
				componentId: component.id,
				componentName: component.name,
				from: prev,
				to: component.status,
				message: component.message,
			};
			newIncidents.push(incident);
			state.incidents.unshift(incident);
		}
		state.componentStatus[component.id] = component.status;
	}

	state.incidents = state.incidents.slice(0, 100);
	state.lastSnapshot = snapshot;
	return newIncidents;
}
