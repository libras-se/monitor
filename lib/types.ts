export type CheckStatus =
	| "operational"
	| "degraded"
	| "down"
	| "unknown"
	| "disabled";

export type ComponentGroup = "apps" | "infra";

export interface ComponentCheck {
	id: string;
	name: string;
	group: ComponentGroup;
	status: CheckStatus;
	latencyMs: number | null;
	message?: string;
	details?: Record<string, unknown>;
	checkedAt: string;
}

export interface StatusSnapshot {
	overall: CheckStatus;
	components: ComponentCheck[];
	checkedAt: string;
	uptimeRatio?: number;
}

export interface IncidentEvent {
	id: string;
	at: string;
	componentId: string;
	componentName: string;
	from: CheckStatus;
	to: CheckStatus;
	message?: string;
}
