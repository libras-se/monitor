import { getConfig } from "@/lib/config";
import type { CheckStatus, ComponentCheck, IncidentEvent } from "@/lib/types";

const STATUS_EMOJI: Record<CheckStatus, string> = {
	operational: ":large_green_circle:",
	degraded: ":large_yellow_circle:",
	down: ":red_circle:",
	unknown: ":white_circle:",
	disabled: ":black_circle:",
};

function statusLabel(status: CheckStatus): string {
	const labels: Record<CheckStatus, string> = {
		operational: "Operacional",
		degraded: "Degradado",
		down: "Indisponível",
		unknown: "Desconhecido",
		disabled: "Desativado",
	};
	return labels[status];
}

async function postWebhook(payload: Record<string, unknown>): Promise<boolean> {
	const config = getConfig();
	const url = config.SLACK_WEBHOOK_URL?.trim();
	if (!url) return false;
	const res = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
	return res.ok;
}

async function postBotMessage(text: string, blocks?: Record<string, unknown>[]): Promise<boolean> {
	const config = getConfig();
	const token = config.SLACK_BOT_TOKEN?.trim();
	const channel = config.SLACK_CHANNEL_ID?.trim();
	if (!token || !channel) return false;
	const res = await fetch("https://slack.com/api/chat.postMessage", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			channel,
			text,
			blocks,
		}),
	});
	if (!res.ok) return false;
	const data = (await res.json()) as { ok?: boolean };
	return data.ok === true;
}

function buildStatusBlocks(
	overall: CheckStatus,
	components: ComponentCheck[],
	mention?: string,
): Record<string, unknown>[] {
	const lines = components
		.filter((c) => c.status !== "disabled")
		.map(
			(c) =>
				`${STATUS_EMOJI[c.status]} *${c.name}* — ${statusLabel(c.status)}${c.latencyMs != null ? ` (${c.latencyMs}ms)` : ""}`,
		)
		.join("\n");

	return [
		{
			type: "header",
			text: {
				type: "plain_text",
				text: `${STATUS_EMOJI[overall]} Libras Status — ${statusLabel(overall)}`,
				emoji: true,
			},
		},
		...(mention
			? [
					{
						type: "section",
						text: { type: "mrkdwn", text: mention },
					},
				]
			: []),
		{
			type: "section",
			text: { type: "mrkdwn", text: lines || "_Nenhum componente ativo_" },
		},
		{
			type: "context",
			elements: [
				{
					type: "mrkdwn",
					text: `<!date^${Math.floor(Date.now() / 1000)}^{date_short_pretty} {time}|agora>`,
				},
			],
		},
	];
}

export async function sendSlackStatusAlert(
	overall: CheckStatus,
	components: ComponentCheck[],
): Promise<boolean> {
	const config = getConfig();
	if (!config.SLACK_ALERTS_ENABLED) return false;

	const mention =
		overall === "down" && config.SLACK_MENTION_ON_DOWN
			? config.SLACK_MENTION_ON_DOWN
			: undefined;

	const blocks = buildStatusBlocks(overall, components, mention);
	const text = `Libras Status: ${statusLabel(overall)}`;

	if (config.SLACK_WEBHOOK_URL) {
		return postWebhook({ text, blocks });
	}
	return postBotMessage(text, blocks);
}

export async function sendSlackIncidentAlert(
	incidents: IncidentEvent[],
): Promise<boolean> {
	const config = getConfig();
	if (!config.SLACK_ALERTS_ENABLED || incidents.length === 0) return false;

	const lines = incidents
		.map(
			(i) =>
				`• *${i.componentName}*: ${statusLabel(i.from)} → ${statusLabel(i.to)}${i.message ? ` — ${i.message}` : ""}`,
		)
		.join("\n");

	const blocks: Record<string, unknown>[] = [
		{
			type: "header",
			text: {
				type: "plain_text",
				text: ":rotating_light: Mudança de status detectada",
				emoji: true,
			},
		},
		{
			type: "section",
			text: { type: "mrkdwn", text: lines },
		},
	];

	const text = `Mudança de status: ${incidents.map((i) => i.componentName).join(", ")}`;

	if (config.SLACK_WEBHOOK_URL) {
		return postWebhook({ text, blocks });
	}
	return postBotMessage(text, blocks);
}

export async function sendSlackTestMessage(): Promise<{
	sent: boolean;
	mode: "webhook" | "bot" | "none";
}> {
	const config = getConfig();
	const components: ComponentCheck[] = [
		{
			id: "test",
			name: "Teste",
			group: "apps",
			status: "operational",
			latencyMs: 1,
			message: "Mensagem de teste do monitor",
			checkedAt: new Date().toISOString(),
		},
	];

	if (config.SLACK_WEBHOOK_URL) {
		const sent = await postWebhook({
			text: "Teste — Libras Monitor",
			blocks: buildStatusBlocks("operational", components),
		});
		return { sent, mode: "webhook" };
	}

	if (config.SLACK_BOT_TOKEN && config.SLACK_CHANNEL_ID) {
		const sent = await postBotMessage(
			"Teste — Libras Monitor",
			buildStatusBlocks("operational", components),
		);
		return { sent, mode: "bot" };
	}

	return { sent: false, mode: "none" };
}
