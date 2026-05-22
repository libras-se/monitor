import { authorizeCron } from "@/lib/auth";
import { collectStatusWithAlerts } from "@/lib/status";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
	if (!authorizeCron(request)) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { snapshot, incidents, slackSent } = await collectStatusWithAlerts();

	return Response.json({
		ok: true,
		overall: snapshot.overall,
		incidents,
		slackSent,
		checkedAt: snapshot.checkedAt,
	});
}

export async function GET(request: Request) {
	return POST(request);
}
