"use client";

import type { ChatStreamUsage } from "@ai-chat-assistant/shared";
import type { UseChatStreamResult } from "../../hooks/use-chat-stream";

type TokenMeterProps = {
	usage: ChatStreamUsage | null;
	status: UseChatStreamResult["status"];
};

const MAX_TOKENS = 100;

export function TokenMeter({ usage, status }: TokenMeterProps) {
	const tokens = usage?.totalTokens ?? 0;
	const cost = usage?.totalCostUsd ?? 0;
	const progress = Math.min(1, tokens / MAX_TOKENS);

	return (
		<div
			style={{
				display: "grid",
				gap: "8px",
				border: "1px solid #1f2937",
				borderRadius: "8px",
				padding: "16px",
				background: "rgba(15, 23, 42, 0.6)",
			}}
		>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<strong>Token / Cost メーター</strong>
				<span style={{ color: "#38bdf8" }}>{status}</span>
			</div>
			<div
				style={{
					height: "10px",
					borderRadius: "9999px",
					overflow: "hidden",
					background: "rgba(148, 163, 184, 0.3)",
				}}
			>
				<div
					style={{
						height: "100%",
						width: `${progress * 100}%`,
						background: "linear-gradient(90deg, #38bdf8, #a855f7)",
						transition: "width 0.2s ease",
					}}
				/>
			</div>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					fontSize: "13px",
				}}
			>
				<span>{`Tokens: ${tokens}`}</span>
				<span>{`Cost (est.): $${cost.toFixed(6)}`}</span>
			</div>
			<p style={{ fontSize: "12px", color: "#94a3b8" }}>
				ダミーデータ: 100 トークンで満タン、コストは 0.000002 USD/トークン換算。
			</p>
		</div>
	);
}
