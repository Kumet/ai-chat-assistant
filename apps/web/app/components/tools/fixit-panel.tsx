"use client";

import React, { useState } from "react";

import { FIXIT_ENDPOINT, type FixItResponse } from "@ai-chat-assistant/shared";

const DEFAULT_API_BASE_URL = "http://localhost:8001";

const resolveFixItUrl = (): string => {
	const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;
	return `${base}${FIXIT_ENDPOINT}`;
};

const statusLabel: Record<FixItResponse["status"], string> = {
	created: "Draft PR を作成しました",
	no_changes: "変更はありませんでした",
	failed: "FixIt が失敗しました",
};

export function FixItPanel() {
	const [isRunning, setIsRunning] = useState(false);
	const [result, setResult] = useState<FixItResponse | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const handleClick = async () => {
		setIsRunning(true);
		setResult(null);
		setErrorMessage(null);

		try {
			const response = await fetch(resolveFixItUrl(), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({}),
			});
			const payload = (await response.json()) as FixItResponse;

			if (!response.ok) {
				throw new Error(payload.error ?? `HTTP ${response.status}`);
			}

			setResult(payload);
			if (payload.status === "failed") {
				setErrorMessage(payload.error ?? "FixIt が失敗しました");
			}
		} catch (error) {
			setErrorMessage(
				error instanceof Error
					? error.message
					: "FixIt 実行時にエラーが発生しました",
			);
		} finally {
			setIsRunning(false);
		}
	};

	const logs = result?.logs ?? [];

	return (
		<div style={{ display: "grid", gap: "0.75rem" }}>
			<div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
				<button
					type="button"
					onClick={handleClick}
					disabled={isRunning}
					style={{
						background: "linear-gradient(90deg, #22d3ee, #8b5cf6)",
						border: "none",
						borderRadius: "8px",
						padding: "8px 18px",
						fontWeight: 600,
						cursor: isRunning ? "not-allowed" : "pointer",
						color: "#0f172a",
						opacity: isRunning ? 0.6 : 1,
						transition: "opacity 0.2s ease",
					}}
				>
					{isRunning ? "FixIt 実行中..." : "FixIt を実行する"}
				</button>
				{result ? (
					<span style={{ color: "#e2e8f0", fontSize: "0.95rem" }}>
						{statusLabel[result.status]}
					</span>
				) : null}
				{errorMessage ? (
					<span style={{ color: "#f97316", fontSize: "0.95rem" }}>
						{errorMessage}
					</span>
				) : null}
			</div>
			{result?.prUrl ? (
				<a
					href={result.prUrl}
					target="_blank"
					rel="noreferrer"
					style={{
						color: "#38bdf8",
						textDecoration: "underline",
						fontWeight: 600,
					}}
				>
					Draft PR を開く
				</a>
			) : null}
			<details
				style={{
					borderRadius: "8px",
					border: "1px solid rgba(148, 163, 184, 0.35)",
					background: "rgba(15, 23, 42, 0.55)",
					padding: "0.75rem",
					color: "#e2e8f0",
				}}
				open={logs.length > 0}
			>
				<summary style={{ cursor: "pointer" }}>実行ログ</summary>
				{logs.length > 0 ? (
					<pre
						style={{
							marginTop: "0.75rem",
							whiteSpace: "pre-wrap",
							fontSize: "0.85rem",
						}}
					>
						{logs.join("\n")}
					</pre>
				) : (
					<p style={{ margin: "0.75rem 0 0", color: "#94a3b8" }}>
						まだログはありません。
					</p>
				)}
			</details>
		</div>
	);
}
