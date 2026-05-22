export const dynamic = "force-dynamic";

export async function GET() {
	return Response.json({
		ok: true,
		service: "libras-monitor",
		timestamp: new Date().toISOString(),
	});
}
