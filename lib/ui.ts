import type { CheckStatus } from "@/lib/types";

export const STATUS_LABEL: Record<CheckStatus, string> = {
	operational: "Operacional",
	degraded: "Degradado",
	down: "Indisponível",
	unknown: "Desconhecido",
	disabled: "Desativado",
};

export const STATUS_COLOR: Record<CheckStatus, string> = {
	operational: "text-[#0d6a4a]",
	degraded: "text-[#8a4a12]",
	down: "text-[#b42318]",
	unknown: "text-studio-ink-muted",
	disabled: "text-studio-ink-faint",
};

export const STATUS_BADGE: Record<CheckStatus, string> = {
	operational: "bg-[#d4f5e8] text-[#0d6a4a]",
	degraded: "bg-[#fff0e0] text-[#8a4a12]",
	down: "bg-[#fde8e8] text-[#b42318]",
	unknown: "bg-studio-chip text-studio-ink-muted",
	disabled: "bg-studio-chip text-studio-ink-faint",
};

export const STATUS_DOT: Record<CheckStatus, string> = {
	operational: "bg-[#22c55e]",
	degraded: "bg-[#e07a2a]",
	down: "bg-[#ef4444]",
	unknown: "bg-studio-ink-faint",
	disabled: "bg-studio-border-muted",
};

export const STATUS_ICON_WRAP: Record<CheckStatus, string> = {
	operational: "bg-studio-gradient text-white shadow-studio-glass",
	degraded: "bg-[#fff0e0] text-[#e07a2a]",
	down: "bg-[#fde8e8] text-[#b42318]",
	unknown: "bg-studio-chip text-studio-teal",
	disabled: "bg-studio-chip text-studio-ink-faint",
};

export const OVERALL_HEADLINE: Record<CheckStatus, string> = {
	operational: "Todos os sistemas operacionais",
	degraded: "Degradação parcial detectada",
	down: "Incidente em andamento",
	unknown: "Status indeterminado",
	disabled: "Monitoramento desativado",
};
