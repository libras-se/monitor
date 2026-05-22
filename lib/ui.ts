import type { CheckStatus } from "@/lib/types";

export const STATUS_LABEL: Record<CheckStatus, string> = {
	operational: "Operacional",
	degraded: "Degradado",
	down: "Indisponível",
	unknown: "Desconhecido",
	disabled: "Desativado",
};

export const STATUS_COLOR: Record<CheckStatus, string> = {
	operational: "text-emerald-400",
	degraded: "text-amber-400",
	down: "text-rose-400",
	unknown: "text-zinc-400",
	disabled: "text-zinc-600",
};

export const STATUS_BG: Record<CheckStatus, string> = {
	operational: "bg-emerald-500/15 border-emerald-500/30",
	degraded: "bg-amber-500/15 border-amber-500/30",
	down: "bg-rose-500/15 border-rose-500/30",
	unknown: "bg-zinc-500/15 border-zinc-500/30",
	disabled: "bg-zinc-800/40 border-zinc-700/40",
};

export const STATUS_DOT: Record<CheckStatus, string> = {
	operational: "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]",
	degraded: "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]",
	down: "bg-rose-500 shadow-[0_0_14px_rgba(244,63,94,0.6)]",
	unknown: "bg-zinc-400",
	disabled: "bg-zinc-600",
};

export const OVERALL_HEADLINE: Record<CheckStatus, string> = {
	operational: "Todos os sistemas operacionais",
	degraded: "Degradação parcial detectada",
	down: "Incidente em andamento",
	unknown: "Status indeterminado",
	disabled: "Monitoramento desativado",
};
