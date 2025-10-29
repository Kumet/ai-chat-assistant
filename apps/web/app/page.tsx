"use client";

import { useMemo } from "react";

import { MessageList } from "./components/chat/message-list";
import { TokenMeter } from "./components/chat/token-meter";
import { useChatStream } from "./hooks/use-chat-stream";

export default function HomePage() {
	const { tokens, usage, status, lastError, restart } = useChatStream();

	const fullText = useMemo(
		() => tokens.map((event) => event.payload.token).join(""),
		[tokens],
	);

	return (
		<main
			style={{
				padding: "2rem",
				display: "grid",
				gap: "1.5rem",
				color: "#e2e8f0",
				background:
					"radial-gradient(circle at top, rgba(56, 189, 248, 0.2), transparent 65%)",
			}}
		>
			<header style={{ display: "grid", gap: "0.5rem" }}>
				<h1 style={{ fontSize: "1.75rem", margin: 0 }}>
					AI Chat Assistant Stream Demo
				</h1>
				<p style={{ margin: 0, color: "#94a3b8" }}>
					PR-02: SSE
					ダミーストリームと仮想化メッセージビュー、トークン/コストメーター。
				</p>
			</header>
			<section style={{ display: "grid", gap: "1rem" }}>
				<TokenMeter usage={usage} status={status} />
				<div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
					<button
						type="button"
						onClick={restart}
						style={{
							background: "linear-gradient(90deg, #38bdf8, #a855f7)",
							border: "none",
							borderRadius: "8px",
							padding: "8px 16px",
							fontWeight: 600,
							cursor: "pointer",
							color: "#0f172a",
						}}
					>
						再接続
					</button>
					{lastError ? (
						<span style={{ color: "#f97316" }}>{lastError}</span>
					) : null}
				</div>
			</section>
			<section style={{ display: "grid", gap: "1rem" }}>
				<h2 style={{ margin: 0 }}>受信トークン</h2>
				<MessageList tokens={tokens} />
			</section>
			<section style={{ display: "grid", gap: "0.5rem" }}>
				<h2 style={{ margin: 0 }}>連結メッセージ</h2>
				<pre
					style={{
						margin: 0,
						minHeight: "120px",
						padding: "16px",
						borderRadius: "8px",
						border: "1px solid #1f2937",
						background: "rgba(15, 23, 42, 0.6)",
						whiteSpace: "pre-wrap",
					}}
				>
					{fullText || "(まだトークンは受信されていません)"}
				</pre>
			</section>
		</main>
	);
}
