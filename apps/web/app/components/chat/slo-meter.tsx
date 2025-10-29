"use client";

import React from "react";

import type { SloMetric } from "@ai-chat-assistant/shared";

type SloMeterProps = {
	metric: SloMetric | null;
};

const DURATION_THRESHOLD_MS = 2000;
const TOKENS_THRESHOLD = 120;

const statusColor = (ok: boolean): string => (ok ? "#34d399" : "#f97316");

export function SloMeter({ metric }: SloMeterProps) {
	if (!metric) {
		return (
			<div
				style={{
					borderRadius: "8px",
					border: "1px solid rgba(148, 163, 184, 0.35)",
					background: "rgba(15, 23, 42, 0.55)",
					padding: "0.75rem",
					color: "#94a3b8",
				}}
			>
				最新の SLO データを取得しています…
			</div>
		);
	}

	const durationOk = metric.durationMs <= DURATION_THRESHOLD_MS;
	const tokensOk = metric.tokens <= TOKENS_THRESHOLD;
	const cacheOk = metric.cacheHit;

	return (
		<div
			style={{
				display: "grid",
				gap: "0.5rem",
				borderRadius: "12px",
				border: "1px solid rgba(148, 163, 184, 0.35)",
				background: "rgba(15, 23, 42, 0.55)",
				padding: "0.75rem 1rem",
				color: "#e2e8f0",
			}}
		>
			<div style={{ display: "flex", justifyContent: "space-between" }}>
				<span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>SLO</span>
				<span style={{ fontSize: "0.75rem", color: "#64748b" }}>
					{new Date(metric.timestamp).toLocaleTimeString()}
				</span>
			</div>
			<div style={{ display: "grid", gap: "0.35rem" }}>
				<MetricRow
					label="応答時間"
					value={`${metric.durationMs.toFixed(0)} ms`}
					ok={durationOk}
					threshold={`≦ ${DURATION_THRESHOLD_MS} ms`}
				/>
				<MetricRow
					label="トークン数"
					value={`${metric.tokens}`}
					ok={tokensOk}
					threshold={`≦ ${TOKENS_THRESHOLD}`}
				/>
				<MetricRow
					label="キャッシュ"
					value={cacheOk ? "HIT" : "MISS"}
					ok={cacheOk}
					threshold="HIT"
				/>
			</div>
		</div>
	);
}

type MetricRowProps = {
	label: string;
	value: string;
	ok: boolean;
	threshold: string;
};

function MetricRow({ label, value, ok, threshold }: MetricRowProps) {
	return (
		<div style={{ display: "flex", justifyContent: "space-between" }}>
			<span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{label}</span>
			<span style={{ display: "flex", gap: "0.5rem", fontSize: "0.9rem" }}>
				<span style={{ color: statusColor(ok), fontWeight: 600 }}>{value}</span>
				<span style={{ color: "#64748b", fontSize: "0.8rem" }}>
					({threshold})
				</span>
			</span>
		</div>
	);
}
