import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { getConfig } from "@/lib/config";
import type { CheckStatus, IncidentEvent, StatusSnapshot } from "@/lib/types";

interface PersistedState {
	lastSnapshot: StatusSnapshot | null;
	incidents: IncidentEvent[];
	componentStatus: Record<string, CheckStatus>;
}

const memory: PersistedState = {
	lastSnapshot: null,
	incidents: [],
	componentStatus: {},
};

function statePath(): string {
	const config = getConfig();
	return path.isAbsolute(config.MONITOR_STATE_PATH)
		? config.MONITOR_STATE_PATH
		: path.join(
				/* turbopackIgnore: true */ process.cwd(),
				config.MONITOR_STATE_PATH,
			);
}

async function load(): Promise<PersistedState> {
	const file = statePath();
	if (!existsSync(file)) return memory;
	try {
		const raw = await readFile(file, "utf8");
		const parsed = JSON.parse(raw) as PersistedState;
		Object.assign(memory, parsed);
		return memory;
	} catch {
		return memory;
	}
}

async function save(state: PersistedState): Promise<void> {
	const file = statePath();
	await writeFile(file, JSON.stringify(state, null, 2), "utf8");
}

export async function getIncidents(limit = 30): Promise<IncidentEvent[]> {
	const state = await load();
	return state.incidents.slice(0, limit);
}

export async function recordSnapshot(
	snapshot: StatusSnapshot,
): Promise<IncidentEvent[]> {
	const state = await load();
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
	await save(state);
	return newIncidents;
}

export async function getLastSnapshot(): Promise<StatusSnapshot | null> {
	const state = await load();
	return state.lastSnapshot;
}
