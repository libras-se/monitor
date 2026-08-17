"use client";

import {
	Activity,
	AlertTriangle,
	Check,
	Clock,
	Database,
	RefreshCw,
	Server,
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
	STATUS_BADGE,
	STATUS_COLOR,
	STATUS_DOT,
	STATUS_ICON_WRAP,
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

function BrandMark() {
	return (
		<span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-studio-overlay bg-white p-1 shadow-sm">
			<img
				src="/logo.png"
				alt=""
				className="h-full w-full object-contain"
				draggable={false}
			/>
		</span>
	);
}

function StatusBadge({ status }: { status: CheckStatus }) {
	return (
		<span
			className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium leading-snug ${STATUS_BADGE[status]}`}
		>
			<span
				className={`size-2 shrink-0 rounded-full ${STATUS_DOT[status]}`}
				aria-hidden
			/>
			{STATUS_LABEL[status]}
		</span>
	);
}

function ComponentCard({ check }: { check: ComponentCheck }) {
	const muted = check.status === "disabled";
	return (
		<div
			className={`studio-glass-card p-5 ${muted ? "opacity-60" : ""}`}
		>
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0 flex-1">
					<p className="font-semibold tracking-tight text-studio-ink">
						{check.name}
					</p>
					{check.message ? (
						<p className="mt-1 text-sm text-studio-ink-muted">
							{check.message}
						</p>
					) : null}
				</div>
				<div className="flex shrink-0 flex-col items-end gap-2">
					<StatusBadge status={check.status} />
					{check.latencyMs != null ? (
						<span className="font-mono text-[11px] text-studio-ink-faint">
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
	const OverallIcon = overall === "down" ? AlertTriangle : overall === "operational" ? Check : Activity;

	return (
		<div className="organic-dashboard-shell">
			<div className="landing-dot-grid pointer-events-none fixed inset-0" aria-hidden />
			<div className="organic-dashboard-orb organic-dashboard-orb-a opacity-35" aria-hidden />
			<div className="organic-dashboard-orb organic-dashboard-orb-b opacity-30" aria-hidden />

			<div className="relative z-10 mx-auto flex w-full max-w-[60rem] flex-1 flex-col px-5 py-4 sm:px-10 sm:py-5">
				<header className="mb-8 flex items-center justify-between gap-4 sm:mb-10">
					<div className="flex items-center gap-2.5">
						<BrandMark />
						<div className="min-w-0">
							<p className="text-[15px] font-semibold tracking-tight text-studio-ink">
								Libras-se
							</p>
							<p className="truncate text-[11px] text-studio-ink-muted">
								Status dos serviços
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={() => {
							setLoading(true);
							void fetchStatus();
						}}
						className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-studio-row-border bg-white px-5 text-[13px] font-semibold text-studio-ink shadow-sm ring-1 ring-black/[0.04] transition hover:border-studio-teal/40 hover:bg-studio-teal/[0.06] hover:text-studio-teal-deep"
					>
						<RefreshCw
							className={`size-4 ${loading ? "animate-spin" : ""}`}
							strokeWidth={2}
						/>
						Atualizar
					</button>
				</header>

				<main className="flex flex-1 flex-col pb-10">
					<div className="mb-8">
						<p className="island-kicker">Monitoramento</p>
						<h1 className="page-section-title mt-2">
							{data?.meta.title ?? "Libras Status"}
						</h1>
						<p className="mt-2.5 max-w-xl text-[14px] leading-relaxed text-studio-ink-muted sm:text-[15px]">
							{data?.meta.tagline ??
								"Monitoramento em tempo real dos serviços Libras"}
						</p>
					</div>

					<section className="studio-glass-panel mb-10 overflow-hidden p-5 sm:p-7">
						<div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
							<div className="flex items-center gap-4">
								<div
									className={`flex size-14 shrink-0 items-center justify-center rounded-2xl ${STATUS_ICON_WRAP[overall]}`}
								>
									<OverallIcon className="size-7" strokeWidth={1.75} />
								</div>
								<div>
									<p
										className={`text-[clamp(1.25rem,2.4vw,1.65rem)] font-extrabold tracking-[-0.03em] ${STATUS_COLOR[overall]}`}
									>
										{OVERALL_HEADLINE[overall]}
									</p>
									<p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-studio-ink-faint">
										<Clock className="size-3.5" />
										{data?.checkedAt
											? `Última verificação: ${formatTime(data.checkedAt)}`
											: "Carregando…"}
										{lastRefresh ? (
											<span>
												· UI {formatTime(lastRefresh.toISOString())}
											</span>
										) : null}
									</p>
								</div>
							</div>
							<div className="flex gap-2 sm:gap-3">
								<StatPill
									label="Operacional"
									value={
										data?.components.filter((c) => c.status === "operational")
											.length ?? 0
									}
									tone="ok"
								/>
								<StatPill
									label="Degradado"
									value={
										data?.components.filter((c) => c.status === "degraded")
											.length ?? 0
									}
									tone="warn"
								/>
								<StatPill
									label="Down"
									value={
										data?.components.filter((c) => c.status === "down")
											.length ?? 0
									}
									tone="down"
								/>
							</div>
						</div>
					</section>

					{error ? (
						<div className="mb-8 rounded-xl border border-[#f1c0c0] bg-[#fde8e8] px-4 py-3 text-sm text-[#b42318]">
							{error}
						</div>
					) : null}

					{groups.map((group) => {
						const meta = GROUP_META[group];
						const Icon = meta.icon;
						const items =
							data?.components.filter((c) => c.group === group) ?? [];
						if (items.length === 0 && !loading) return null;
						return (
							<section key={group} className="mb-10">
								<h2 className="mb-4 flex items-center gap-2 text-[15px] font-semibold tracking-tight text-studio-ink">
									<Icon className="size-4 text-studio-teal" strokeWidth={1.75} />
									{meta.title}
								</h2>
								<div className="grid gap-3 sm:grid-cols-2">
									{items.length > 0
										? items.map((check) => (
												<ComponentCard key={check.id} check={check} />
											))
										: Array.from({ length: 2 }).map((_, i) => (
												<div
													key={`${group}-skeleton-${i}`}
													className="studio-glass-card h-[5.5rem] animate-pulse bg-studio-chip/70"
												/>
											))}
								</div>
							</section>
						);
					})}

					{data?.incidents && data.incidents.length > 0 ? (
						<section className="mb-10">
							<h2 className="mb-4 text-[15px] font-semibold tracking-tight text-studio-ink">
								Histórico recente
							</h2>
							<ul className="space-y-2">
								{data.incidents.map((inc) => (
									<li
										key={inc.id}
										className="studio-glass-card flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm"
									>
										<span className="font-mono text-[11px] text-studio-ink-faint">
											{formatTime(inc.at)}
										</span>
										<span className="font-semibold text-studio-ink">
											{inc.componentName}
										</span>
										<span className="text-studio-ink-muted">
											{STATUS_LABEL[inc.from]} →{" "}
											<span className={STATUS_COLOR[inc.to]}>
												{STATUS_LABEL[inc.to]}
											</span>
										</span>
										{inc.message ? (
											<span className="text-studio-ink-faint">
												— {inc.message}
											</span>
										) : null}
									</li>
								))}
							</ul>
						</section>
					) : null}

					<footer className="mt-auto border-t border-studio-row-border pt-8 text-center text-[12px] text-studio-ink-faint">
						Atualização automática a cada {Math.round(pollMs / 1000)}s · API,
						Huet, Tils e dependências via API
					</footer>
				</main>
			</div>
		</div>
	);
}

function StatPill({
	label,
	value,
	tone,
}: {
	label: string;
	value: number;
	tone: "ok" | "warn" | "down";
}) {
	const toneClass =
		tone === "ok"
			? "bg-[#d4f5e8] text-[#0d6a4a]"
			: tone === "warn"
				? "bg-[#fff0e0] text-[#8a4a12]"
				: "bg-[#fde8e8] text-[#b42318]";

	return (
		<div
			className={`min-w-[4.75rem] rounded-2xl px-3 py-2.5 text-center ${toneClass}`}
		>
			<p className="text-xl font-extrabold tabular-nums tracking-tight">
				{value}
			</p>
			<p className="text-[11px] font-medium opacity-80">{label}</p>
		</div>
	);
}
