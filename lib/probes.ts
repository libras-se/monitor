import { getConfig, isServiceEnabled } from "@/lib/config";
import type { CheckStatus, ComponentCheck, ComponentGroup } from "@/lib/types";

type ApiDependencyStatus = "operational" | "degraded" | "down" | "disabled";

type ApiDependencyCheck = {
	status: ApiDependencyStatus;
	latencyMs: number | null;
	message: string;
};

type ApiStatusPayload = {
	success?: boolean;
	status?: string;
	checks?: {
		database?: ApiDependencyCheck;
		rabbitmq?: ApiDependencyCheck;
		storage?: ApiDependencyCheck;
		worker?: ApiDependencyCheck;
	};
};

const API_DEPENDENCIES: {
	key: keyof NonNullable<ApiStatusPayload["checks"]>;
	id: string;
	name: string;
	group: ComponentGroup;
}[] = [
	{ key: "database", id: "database", name: "PostgreSQL", group: "infra" },
	{ key: "rabbitmq", id: "rabbitmq", name: "RabbitMQ", group: "infra" },
	{ key: "storage", id: "storage", name: "Object storage (MinIO/S3)", group: "infra" },
	{ key: "worker", id: "worker", name: "Worker", group: "apps" },
];

function nowIso() {
	return new Date().toISOString();
}

function statusFromHttp(
	ok: boolean,
	degraded = false,
): CheckStatus {
	if (ok && !degraded) return "operational";
	if (ok && degraded) return "degraded";
	return "down";
}

async function fetchProbe(
	url: string,
	init?: RequestInit,
): Promise<{ ok: boolean; status: number; body: unknown; latencyMs: number }> {
	const config = getConfig();
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), config.REQUEST_TIMEOUT_MS);
	const started = performance.now();
	try {
		const res = await fetch(url, {
			...init,
			signal: controller.signal,
			cache: "no-store",
			headers: {
				Accept: "application/json, text/plain, */*",
				...init?.headers,
			},
		});
		const latencyMs = Math.round(performance.now() - started);
		const contentType = res.headers.get("content-type") ?? "";
		let body: unknown = null;
		if (contentType.includes("application/json")) {
			body = await res.json().catch(() => null);
		} else {
			const text = await res.text();
			body = text.trim();
		}
		return { ok: res.ok, status: res.status, body, latencyMs };
	} finally {
		clearTimeout(timeout);
	}
}

function makeCheck(
	id: string,
	name: string,
	group: ComponentGroup,
	status: CheckStatus,
	latencyMs: number | null,
	message?: string,
	details?: Record<string, unknown>,
): ComponentCheck {
	return {
		id,
		name,
		group,
		status,
		latencyMs,
		message,
		details,
		checkedAt: nowIso(),
	};
}

function disabledCheck(
	id: string,
	name: string,
	group: ComponentGroup,
): ComponentCheck {
	return makeCheck(id, name, group, "disabled", null, "Não configurado");
}

function isApiDependencyStatus(value: unknown): value is ApiDependencyStatus {
	return (
		value === "operational" ||
		value === "degraded" ||
		value === "down" ||
		value === "disabled"
	);
}

export function componentsFromApiStatus(
	payload: ApiStatusPayload | null,
	fallbackMessage: string,
): ComponentCheck[] {
	return API_DEPENDENCIES.map((meta) => {
		const check = payload?.checks?.[meta.key];
		if (!check || !isApiDependencyStatus(check.status)) {
			return makeCheck(
				meta.id,
				meta.name,
				meta.group,
				"unknown",
				null,
				fallbackMessage,
			);
		}
		return makeCheck(
			meta.id,
			meta.name,
			meta.group,
			check.status,
			check.latencyMs,
			check.message,
		);
	});
}

export async function probeApiHealth(): Promise<ComponentCheck> {
	const config = getConfig();
	if (!isServiceEnabled(config.API_BASE_URL)) {
		return disabledCheck("api-health", "API (liveness)", "apps");
	}
	const url = new URL(config.API_HEALTH_PATH, config.API_BASE_URL).toString();
	try {
		const { ok, status, body, latencyMs } = await fetchProbe(url);
		const payload = body as { success?: boolean; status?: string } | null;
		const healthy =
			ok && (payload?.success === true || payload?.status === "ok");
		return makeCheck(
			"api-health",
			"API (liveness)",
			"apps",
			statusFromHttp(healthy),
			latencyMs,
			healthy ? "Respondendo" : `HTTP ${status}`,
			typeof body === "object" ? (body as Record<string, unknown>) : undefined,
		);
	} catch (err) {
		return makeCheck(
			"api-health",
			"API (liveness)",
			"apps",
			"down",
			null,
			err instanceof Error ? err.message : "Falha na requisição",
		);
	}
}

export async function probeApiStatus(): Promise<ComponentCheck[]> {
	const config = getConfig();
	if (!isServiceEnabled(config.API_BASE_URL)) {
		return API_DEPENDENCIES.map((meta) =>
			disabledCheck(meta.id, meta.name, meta.group),
		);
	}
	const url = new URL(config.API_STATUS_PATH, config.API_BASE_URL).toString();
	try {
		const { ok, status, body } = await fetchProbe(url);
		const payload = (typeof body === "object" && body !== null
			? body
			: null) as ApiStatusPayload | null;
		if (!ok || payload?.success !== true) {
			return componentsFromApiStatus(
				payload,
				ok ? "Resposta de /status incompleta" : `API /status indisponível (HTTP ${status})`,
			);
		}
		return componentsFromApiStatus(payload, "Resposta de /status incompleta");
	} catch (err) {
		const message = err instanceof Error ? err.message : "Falha na requisição";
		return API_DEPENDENCIES.map((meta) =>
			makeCheck(meta.id, meta.name, meta.group, "down", null, message),
		);
	}
}

export async function probeHuet(): Promise<ComponentCheck> {
	const config = getConfig();
	if (!isServiceEnabled(config.HUET_BASE_URL)) {
		return disabledCheck("huet", "Huet", "apps");
	}
	const url = new URL(config.HUET_HEALTH_PATH, config.HUET_BASE_URL).toString();
	try {
		const { ok, body, latencyMs } = await fetchProbe(url);
		const text = typeof body === "string" ? body.toLowerCase() : "";
		const healthy = ok && (text === "ok" || text.includes("ok"));
		return makeCheck(
			"huet",
			"Huet",
			"apps",
			statusFromHttp(healthy),
			latencyMs,
			healthy ? "Frontend SaaS no ar" : "Resposta inesperada",
		);
	} catch (err) {
		return makeCheck(
			"huet",
			"Huet",
			"apps",
			"down",
			null,
			err instanceof Error ? err.message : "Falha na requisição",
		);
	}
}

export async function probeTils(): Promise<ComponentCheck> {
	const config = getConfig();
	if (!isServiceEnabled(config.TILS_BASE_URL)) {
		return disabledCheck("tils", "Tils", "apps");
	}
	const url = new URL(config.TILS_HEALTH_PATH, config.TILS_BASE_URL).toString();
	try {
		const { ok, latencyMs } = await fetchProbe(url, { method: "GET" });
		return makeCheck(
			"tils",
			"Tils",
			"apps",
			statusFromHttp(ok),
			latencyMs,
			ok ? "Painel admin no ar" : "Indisponível",
		);
	} catch (err) {
		return makeCheck(
			"tils",
			"Tils",
			"apps",
			"down",
			null,
			err instanceof Error ? err.message : "Falha na requisição",
		);
	}
}

export async function probeRedis(): Promise<ComponentCheck> {
	const config = getConfig();
	const redisUrl = config.REDIS_URL?.trim();
	if (!redisUrl) {
		return disabledCheck("redis", "Redis", "infra");
	}
	const bun = (globalThis as { Bun?: { redis: { get: (url: string) => { ping: () => Promise<string> } } } }).Bun;
	if (!bun?.redis) {
		return makeCheck(
			"redis",
			"Redis",
			"infra",
			"unknown",
			null,
			"Execute o monitor com Bun (`bun run dev`) para ping em REDIS_URL",
		);
	}
	const started = performance.now();
	try {
		const client = bun.redis.get(redisUrl);
		await client.ping();
		const latencyMs = Math.round(performance.now() - started);
		return makeCheck("redis", "Redis", "infra", "operational", latencyMs, "PONG");
	} catch (err) {
		return makeCheck(
			"redis",
			"Redis",
			"infra",
			"down",
			null,
			err instanceof Error ? err.message : "Falha no ping",
		);
	}
}

export function aggregateOverall(components: ComponentCheck[]): CheckStatus {
	const active = components.filter((c) => c.status !== "disabled");
	if (active.length === 0) return "unknown";
	if (active.some((c) => c.status === "down")) return "down";
	if (active.some((c) => c.status === "degraded")) return "degraded";
	if (active.every((c) => c.status === "operational")) return "operational";
	return "unknown";
}

export function visibleComponents(components: ComponentCheck[]): ComponentCheck[] {
	return components.filter(
		(c) => c.group !== "infra" || c.status !== "disabled",
	);
}

export async function runAllProbes(): Promise<ComponentCheck[]> {
	const [apiHealth, apiStatus, huet, tils, redis] = await Promise.all([
		probeApiHealth(),
		probeApiStatus(),
		probeHuet(),
		probeTils(),
		probeRedis(),
	]);
	return [apiHealth, ...apiStatus, huet, tils, redis];
}
