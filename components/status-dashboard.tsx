"use client";

import {
	Activity,
	AlertTriangle,
	Clock,
	RefreshCw,
	Server,
	Database,
	Workflow,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type {
	CheckStatus,
	ComponentCheck,
	ComponentGroup,
	IncidentEvent,
	StatusSnapshot,
} from "@/lib/types";
import {
	OVERALL_HEADLINE,
	STATUS_BG,
	STATUS_COLOR,
	STATUS_DOT,
	STATUS_LABEL,
} from "@/lib/ui";

interface StatusResponse extends StatusSnapshot {
	incidents: IncidentEvent[];
	meta: {
		title: string;
		tagline: string;
		pollIntervalMs: number;
		publicUrl?: string;
	};
}

const GROUP_META: Record<
	ComponentGroup,
	{ title: string; icon: typeof Server }
> = {
	apps: { title: "Aplicações", icon: Server },
	infra: { title: "Infraestrutura", icon: Database },
};

function formatTime(iso: string) {
	return new Date(iso).toLocaleString("pt-BR", {
		day: "2-digit",
		month: "short",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
}

function ComponentCard({ check }: { check: ComponentCheck }) {
	const muted = check.status === "disabled";
	return (
		<div
			className={`rounded-2xl border p-4 backdrop-blur-sm transition ${STATUS_BG[check.status]} ${muted ? "opacity-60" : ""}`}
		>
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0 flex-1">
					<p className="font-medium text-zinc-100">{check.name}</p>
					{check.message ? (
						<p className="mt-1 text-sm text-zinc-400">{check.message}</p>
					) : null}
				</div>
				<div className="flex shrink-0 flex-col items-end gap-2">
					<span
						className={`inline-flex items-center gap-2 text-sm font-medium ${STATUS_COLOR[check.status]}`}
					>
						<span
							className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[check.status]}`}
						/>
						{STATUS_LABEL[check.status]}
					</span>
					{check.latencyMs != null ? (
						<span className="font-mono text-xs text-zinc-500">
							{check.latencyMs} ms
						</span>
					) : null}
				</div>
			</div>
		</div>
	);
}

export function StatusDashboard() {
	const [data, setData] = useState<StatusResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

	const pollMs = data?.meta.pollIntervalMs ?? 30_000;

	const fetchStatus = useCallback(async () => {
		try {
			const res = await fetch("/api/status", { cache: "no-store" });
			if (!res.ok) {
				throw new Error(`HTTP ${res.status}`);
			}
			const json = (await res.json()) as StatusResponse;
			setData(json);
			setError(null);
			setLastRefresh(new Date());
		} catch (e) {
			setError(e instanceof Error ? e.message : "Falha ao carregar status");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void fetchStatus();
		const id = setInterval(() => void fetchStatus(), pollMs);
		return () => clearInterval(id);
	}, [fetchStatus, pollMs]);

	const overall = data?.overall ?? "unknown";
	const groups: ComponentGroup[] = ["apps", "infra"];

	return (
		<div className="relative min-h-screen overflow-hidden bg-[#07080c] text-zinc-100">
			<div
				className="pointer-events-none absolute inset-0 opacity-40"
				style={{
					backgroundImage:
						"radial-gradient(ellipse 80% 50% at 50% -20%, rgba(56, 189, 248, 0.15), transparent), radial-gradient(ellipse 60% 40% at 100% 50%, rgba(167, 139, 250, 0.08), transparent)",
				}}
			/>
			<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-size-[48px_48px]" />

			<div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
				<header className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<div className="mb-3 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-xs text-zinc-400">
							<Activity className="h-3.5 w-3.5 text-sky-400" />
							Status page
						</div>
						<h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
							{data?.meta.title ?? "Libras Status"}
						</h1>
						<p className="mt-2 max-w-xl text-zinc-400">
							{data?.meta.tagline ??
								"Monitoramento em tempo real dos serviços Libras"}
						</p>
					</div>
					<button
						type="button"
						onClick={() => {
							setLoading(true);
							void fetchStatus();
						}}
						className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800"
					>
						<RefreshCw
							className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
						/>
						Atualizar
					</button>
				</header>

				<section
					className={`mb-10 rounded-3xl border p-6 sm:p-8 ${STATUS_BG[overall]}`}
				>
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex items-center gap-4">
							<div
								className={`flex h-14 w-14 items-center justify-center rounded-2xl ${overall === "operational" ? "bg-emerald-500/20" : overall === "down" ? "bg-rose-500/20" : "bg-amber-500/20"}`}
							>
								{overall === "down" ? (
									<AlertTriangle className="h-7 w-7 text-rose-400" />
								) : (
									<Workflow className="h-7 w-7 text-sky-400" />
								)}
							</div>
							<div>
								<p
									className={`text-2xl font-semibold sm:text-3xl ${STATUS_COLOR[overall]}`}
								>
									{OVERALL_HEADLINE[overall]}
								</p>
								<p className="mt-1 flex items-center gap-2 text-sm text-zinc-500">
									<Clock className="h-3.5 w-3.5" />
									{data?.checkedAt
										? `Última verificação: ${formatTime(data.checkedAt)}`
										: "Carregando…"}
									{lastRefresh ? (
										<span className="text-zinc-600">
											· refresh UI {formatTime(lastRefresh.toISOString())}
										</span>
									) : null}
								</p>
							</div>
						</div>
						<div className="flex gap-6 text-center text-sm">
							<StatPill
								label="Operacional"
								value={
									data?.components.filter((c) => c.status === "operational")
										.length ?? 0
								}
								color="text-emerald-400"
							/>
							<StatPill
								label="Degradado"
								value={
									data?.components.filter((c) => c.status === "degraded")
										.length ?? 0
								}
								color="text-amber-400"
							/>
							<StatPill
								label="Down"
								value={
									data?.components.filter((c) => c.status === "down").length ??
									0
								}
								color="text-rose-400"
							/>
						</div>
					</div>
				</section>

				{error ? (
					<div className="mb-8 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
						{error}
					</div>
				) : null}

				{groups.map((group) => {
					const meta = GROUP_META[group];
					const Icon = meta.icon;
					const items =
						data?.components.filter((c) => c.group === group) ?? [];
					if (items.length === 0) return null;
					return (
						<section key={group} className="mb-10">
							<h2 className="mb-4 flex items-center gap-2 text-lg font-medium text-zinc-300">
								<Icon className="h-5 w-5 text-zinc-500" />
								{meta.title}
							</h2>
							<div className="grid gap-3 sm:grid-cols-2">
								{items.map((check) => (
									<ComponentCard key={check.id} check={check} />
								))}
							</div>
						</section>
					);
				})}

				{data?.incidents && data.incidents.length > 0 ? (
					<section className="mb-10">
						<h2 className="mb-4 text-lg font-medium text-zinc-300">
							Histórico recente
						</h2>
						<ul className="space-y-2">
							{data.incidents.map((inc) => (
								<li
									key={inc.id}
									className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-4 py-3 text-sm"
								>
									<span className="font-mono text-xs text-zinc-500">
										{formatTime(inc.at)}
									</span>
									<span className="font-medium text-zinc-200">
										{inc.componentName}
									</span>
									<span className="text-zinc-500">
										{STATUS_LABEL[inc.from]} →{" "}
										<span className={STATUS_COLOR[inc.to]}>
											{STATUS_LABEL[inc.to]}
										</span>
									</span>
									{inc.message ? (
										<span className="text-zinc-600">— {inc.message}</span>
									) : null}
								</li>
							))}
						</ul>
					</section>
				) : null}

				<footer className="border-t border-zinc-800/80 pt-8 text-center text-xs text-zinc-600">
					Atualização automática a cada {Math.round(pollMs / 1000)}s · API, Huet,
					Tils, Worker, PostgreSQL, RabbitMQ, Storage
				</footer>
			</div>
		</div>
	);
}

function StatPill({
	label,
	value,
	color,
}: {
	label: string;
	value: number;
	color: string;
}) {
	return (
		<div>
			<p className={`text-2xl font-semibold tabular-nums ${color}`}>{value}</p>
			<p className="text-zinc-500">{label}</p>
		</div>
	);
}
