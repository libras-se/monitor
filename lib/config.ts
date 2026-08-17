import { z } from "zod";

function emptyToUndefined(val: unknown): unknown {
	if (typeof val === "string" && val.trim() === "") return undefined;
	return val;
}

const optionalUrl = () =>
	z.preprocess(emptyToUndefined, z.string().url().optional());

const optionalString = () =>
	z.preprocess(emptyToUndefined, z.string().optional());

const bool = z.preprocess(
	emptyToUndefined,
	z
		.string()
		.optional()
		.transform((v) => v === "true" || v === "1"),
);

const envSchema = z.object({
	MONITOR_TITLE: z.string().default("Libras Status"),
	MONITOR_TAGLINE: z
		.string()
		.default("Monitoramento em tempo real dos serviços Libras"),
	MONITOR_PUBLIC_URL: optionalUrl(),
	MONITOR_API_KEY: optionalString(),
	POLL_INTERVAL_MS: z.coerce.number().default(30_000),
	REQUEST_TIMEOUT_MS: z.coerce.number().default(8_000),

	API_BASE_URL: optionalUrl(),
	API_HEALTH_PATH: z.string().default("/health"),
	API_STATUS_PATH: z.string().default("/status"),

	HUET_BASE_URL: optionalUrl(),
	HUET_HEALTH_PATH: z.string().default("/health.txt"),

	TILS_BASE_URL: optionalUrl(),
	TILS_HEALTH_PATH: z.string().default("/"),

	REDIS_URL: optionalString(),

	SLACK_ALERTS_ENABLED: bool,
	SLACK_WEBHOOK_URL: optionalUrl(),
	SLACK_BOT_TOKEN: optionalString(),
	SLACK_CHANNEL_ID: optionalString(),
	SLACK_MENTION_ON_DOWN: optionalString(),

	CRON_SECRET: optionalString(),
});

export type MonitorConfig = z.infer<typeof envSchema>;

let cached: MonitorConfig | null = null;

export function getConfig(): MonitorConfig {
	if (!cached) {
		cached = envSchema.parse(process.env);
	}
	return cached;
}

export function isServiceEnabled(url: string | undefined): boolean {
	return Boolean(url?.trim());
}
