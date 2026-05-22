import { getConfig } from "@/lib/config";

export function authorizeRequest(request: Request): boolean {
	const key = getConfig().MONITOR_API_KEY?.trim();
	if (!key) return true;
	const header = request.headers.get("authorization");
	const bearer = header?.replace(/^Bearer\s+/i, "").trim();
	const apiKey = request.headers.get("x-monitor-api-key")?.trim();
	return bearer === key || apiKey === key;
}

export function authorizeCron(request: Request): boolean {
	const secret = getConfig().CRON_SECRET?.trim();
	if (!secret) return false;
	const header = request.headers.get("authorization");
	const bearer = header?.replace(/^Bearer\s+/i, "").trim();
	const cronHeader = request.headers.get("x-cron-secret")?.trim();
	return bearer === secret || cronHeader === secret;
}
