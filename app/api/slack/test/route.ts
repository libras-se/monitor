import { authorizeRequest } from "@/lib/auth";
import { sendSlackTestMessage } from "@/lib/slack";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
	if (!authorizeRequest(request)) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const result = await sendSlackTestMessage();

	if (!result.sent) {
		return Response.json(
			{
				success: false,
				error:
					"Slack não configurado. Defina SLACK_WEBHOOK_URL ou SLACK_BOT_TOKEN + SLACK_CHANNEL_ID.",
				mode: result.mode,
			},
			{ status: 503 },
		);
	}

	return Response.json({ success: true, mode: result.mode });
}
