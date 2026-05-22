import { getConfig, isServiceEnabled } from "@/lib/config";
import type { CheckStatus, ComponentCheck, ComponentGroup } from "@/lib/types";

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

export async function probeApiReady(): Promise<ComponentCheck> {
	const config = getConfig();
	if (!isServiceEnabled(config.API_BASE_URL)) {
		return disabledCheck("api-ready", "API (readiness / DB)", "infra");
	}
	const url = new URL(config.API_READY_PATH, config.API_BASE_URL).toString();
	try {
		const { ok, status, body, latencyMs } = await fetchProbe(url);
		const payload = body as { success?: boolean; status?: string } | null;
		const ready =
			ok && payload?.success === true && payload?.status === "ready";
		const degraded =
			ok && payload?.status === "ready" && payload?.success !== true;
		return makeCheck(
			"api-ready",
			"PostgreSQL (via API /ready)",
			"infra",
			statusFromHttp(ready || ok, degraded || (!ready && ok)),
			latencyMs,
			ready
				? "Banco acessível"
				: ok
					? "API up, readiness incerto"
					: `Indisponível (HTTP ${status})`,
			typeof body === "object" ? (body as Record<string, unknown>) : undefined,
		);
	} catch (err) {
		return makeCheck(
			"api-ready",
			"PostgreSQL (via API /ready)",
			"infra",
			"down",
			null,
			err instanceof Error ? err.message : "Falha na requisição",
		);
	}
}

export async function probeWorker(): Promise<ComponentCheck> {
	const config = getConfig();
	if (!isServiceEnabled(config.WORKER_HEALTH_URL)) {
		return disabledCheck("worker", "Worker", "apps");
	}
	try {
		const { ok, status, body, latencyMs } = await fetchProbe(
			config.WORKER_HEALTH_URL!,
		);
		const payload = body as { ok?: boolean; rabbit?: boolean } | null;
		const workerOk = ok && payload?.ok === true;
		const rabbitOk = payload?.rabbit === true;
		const checkStatus: CheckStatus = workerOk
			? rabbitOk
				? "operational"
				: "degraded"
			: "down";
		return makeCheck(
			"worker",
			"Worker",
			"apps",
			checkStatus,
			latencyMs,
			workerOk
				? rabbitOk
					? "Processo e fila RabbitMQ"
					: "Processo ok, RabbitMQ desconectado"
				: `HTTP ${status}`,
			typeof body === "object" ? (body as Record<string, unknown>) : undefined,
		);
	} catch (err) {
		return makeCheck(
			"worker",
			"Worker",
			"apps",
			"down",
			null,
			err instanceof Error ? err.message : "Falha na requisição",
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

export async function probeRabbitManagement(): Promise<ComponentCheck> {
	const config = getConfig();
	if (!isServiceEnabled(config.RABBITMQ_MANAGEMENT_URL)) {
		return disabledCheck("rabbitmq", "RabbitMQ (management)", "infra");
	}
	const user = config.RABBITMQ_MANAGEMENT_USER ?? "guest";
	const pass = config.RABBITMQ_MANAGEMENT_PASSWORD ?? "guest";
	const base = config.RABBITMQ_MANAGEMENT_URL!.replace(/\/$/, "");
	const url = `${base}/api/overview`;
	const auth = Buffer.from(`${user}:${pass}`).toString("base64");
	try {
		const { ok, latencyMs, body } = await fetchProbe(url, {
			headers: { Authorization: `Basic ${auth}` },
		});
		return makeCheck(
			"rabbitmq",
			"RabbitMQ (management)",
			"infra",
			statusFromHttp(ok),
			latencyMs,
			ok ? "Broker acessível" : "Management API indisponível",
			typeof body === "object" ? { overview: true } : undefined,
		);
	} catch (err) {
		return makeCheck(
			"rabbitmq",
			"RabbitMQ (management)",
			"infra",
			"down",
			null,
			err instanceof Error ? err.message : "Falha na requisição",
		);
	}
}

export async function probeStorage(): Promise<ComponentCheck> {
	const config = getConfig();
	if (!isServiceEnabled(config.STORAGE_HEALTH_URL)) {
		return disabledCheck("storage", "Object storage (MinIO/S3)", "infra");
	}
	try {
		const { ok, latencyMs } = await fetchProbe(config.STORAGE_HEALTH_URL!);
		return makeCheck(
			"storage",
			"Object storage (MinIO/S3)",
			"infra",
			statusFromHttp(ok),
			latencyMs,
			ok ? "Storage live" : "Health check falhou",
		);
	} catch (err) {
		return makeCheck(
			"storage",
			"Object storage (MinIO/S3)",
			"infra",
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

export async function probeDatabaseDirect(): Promise<ComponentCheck> {
	const config = getConfig();
	const dbUrl = config.DATABASE_URL?.trim();
	if (!dbUrl) {
		return disabledCheck("database-direct", "PostgreSQL (direto)", "infra");
	}
	const SQL = (globalThis as { Bun?: { SQL: new (url: string) => { (strings: TemplateStringsArray): Promise<unknown> } } }).Bun?.SQL;
	if (!SQL) {
		return makeCheck(
			"database-direct",
			"PostgreSQL (direto)",
			"infra",
			"unknown",
			null,
			"Execute com Bun (`bun run dev`) ou use API /ready",
		);
	}
	const started = performance.now();
	try {
		const sql = new SQL(dbUrl);
		await sql`SELECT 1`;
		const latencyMs = Math.round(performance.now() - started);
		return makeCheck(
			"database-direct",
			"PostgreSQL (direto)",
			"infra",
			"operational",
			latencyMs,
			"Conexão direta ok",
		);
	} catch (err) {
		return makeCheck(
			"database-direct",
			"PostgreSQL (direto)",
			"infra",
			"down",
			null,
			err instanceof Error ? err.message : "Falha na conexão",
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

export async function runAllProbes(): Promise<ComponentCheck[]> {
	return Promise.all([
		probeApiHealth(),
		probeApiReady(),
		probeWorker(),
		probeHuet(),
		probeTils(),
		probeRabbitManagement(),
		probeStorage(),
		probeRedis(),
		probeDatabaseDirect(),
	]);
}
