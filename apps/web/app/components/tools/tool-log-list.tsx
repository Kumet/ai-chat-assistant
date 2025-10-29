"use client";

import type {
	ToolStage,
	ToolStatus,
	ToolStreamEvent,
} from "@ai-chat-assistant/shared";

const stageLabels: Record<ToolStage, string> = {
	test_generation: "テスト生成",
	pytest_initial_run: "初回 pytest",
	fix_application: "修正適用",
	pytest_rerun: "再実行 pytest",
	completed: "完了",
};

const statusLabels: Record<ToolStatus, string> = {
	pending: "待機中",
	in_progress: "進行中",
	failed: "失敗",
	succeeded: "成功",
};

const statusColors: Record<ToolStatus, string> = {
	pending: "#fbbf24",
	in_progress: "#38bdf8",
	failed: "#f97316",
	succeeded: "#34d399",
};

const stageBadgeColor: Record<ToolStage, string> = {
	test_generation: "#38bdf8",
	pytest_initial_run: "#a855f7",
	fix_application: "#facc15",
	pytest_rerun: "#22d3ee",
	completed: "#34d399",
};

type ToolLogListProps = {
	events: ToolStreamEvent[];
};

export const ToolLogList = ({ events }: ToolLogListProps) => {
	if (events.length === 0) {
		return (
			<p style={{ color: "#94a3b8", margin: 0 }}>
				まだ実況ログはありません。上のフォームからテスト生成を開始してください。
			</p>
		);
	}

	return (
		<div
			style={{
				display: "grid",
				gap: "0.5rem",
				maxHeight: "320px",
				overflowY: "auto",
				padding: "0.75rem",
				borderRadius: "12px",
				border: "1px solid rgba(148, 163, 184, 0.3)",
				background: "rgba(15, 23, 42, 0.55)",
			}}
		>
			{events.map((event) => {
				if (event.type === "token") {
					const stage = stageLabels[event.payload.stage];
					const key = `${event.payload.stage}-${event.payload.timestamp}`;
					return (
						<div
							key={key}
							style={{
								display: "grid",
								gap: "0.25rem",
								padding: "0.5rem 0.75rem",
								borderRadius: "8px",
								background: "rgba(59, 130, 246, 0.08)",
							}}
						>
							<span
								style={{
									display: "inline-flex",
									alignItems: "center",
									gap: "0.35rem",
									fontSize: "0.85rem",
									color: "#bae6fd",
								}}
							>
								<span
									style={{
										padding: "0.1rem 0.4rem",
										borderRadius: "999px",
										fontWeight: 600,
										fontSize: "0.7rem",
										background: stageBadgeColor[event.payload.stage],
										color: "#0f172a",
									}}
								>
									{stage}
								</span>
								ログ
							</span>
							<p
								style={{ margin: 0, color: "#e2e8f0", whiteSpace: "pre-wrap" }}
							>
								{event.payload.message}
							</p>
						</div>
					);
				}

				if (event.type === "tool") {
					const { stage, status, summary } = event.payload;
					const key = `${stage}-${event.payload.timestamp}`;
					return (
						<div
							key={key}
							style={{
								display: "flex",
								flexDirection: "column",
								gap: "0.35rem",
								padding: "0.6rem 0.8rem",
								borderRadius: "8px",
								background: "rgba(12, 74, 110, 0.2)",
								border: `1px solid ${statusColors[status]}40`,
							}}
						>
							<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
								<span
									style={{
										display: "inline-flex",
										alignItems: "center",
										gap: "0.4rem",
										fontWeight: 600,
										color: stageBadgeColor[stage],
									}}
								>
									{stageLabels[stage]}
								</span>
								<span
									style={{
										padding: "0.1rem 0.45rem",
										borderRadius: "999px",
										fontSize: "0.75rem",
										fontWeight: 600,
										background: `${statusColors[status]}33`,
										color: statusColors[status],
									}}
								>
									{statusLabels[status]}
								</span>
							</div>
							{summary ? (
								<p
									style={{
										margin: 0,
										color: "#e2e8f0",
										fontSize: "0.9rem",
									}}
								>
									{summary}
								</p>
							) : null}
						</div>
					);
				}

				const key = `error-${event.timestamp}`;
				return (
					<div
						key={key}
						style={{
							padding: "0.6rem 0.8rem",
							borderRadius: "8px",
							background: "rgba(220, 38, 38, 0.15)",
							color: "#fecaca",
						}}
					>
						{event.message}
					</div>
				);
			})}
		</div>
	);
};
