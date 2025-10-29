"use client";

import { useMemo, useRef } from "react";

import type { ChatStreamTokenEvent } from "@ai-chat-assistant/shared";
import { useVirtualizer } from "@tanstack/react-virtual";

type MessageListProps = {
	tokens: ChatStreamTokenEvent[];
};

const ESTIMATED_ROW_HEIGHT = 28;

export function MessageList({ tokens }: MessageListProps) {
	const parentRef = useRef<HTMLDivElement | null>(null);
	const tokenRows = useMemo(
		() =>
			tokens.map((event) => ({
				id: event.payload.id,
				text: event.payload.token,
				index: event.payload.index,
				at: new Date(event.payload.timestamp),
			})),
		[tokens],
	);

	const virtualizer = useVirtualizer({
		count: tokenRows.length,
		estimateSize: () => ESTIMATED_ROW_HEIGHT,
		getScrollElement: () => parentRef.current,
		overScan: 5,
	});

	const virtualItems = virtualizer.getVirtualItems();

	return (
		<div
			ref={parentRef}
			style={{
				height: "260px",
				overflow: "auto",
				border: "1px solid #1f2937",
				borderRadius: "8px",
				background: "rgba(15, 23, 42, 0.6)",
				padding: "0 12px",
			}}
		>
			<div
				style={{
					height: virtualizer.getTotalSize(),
					width: "100%",
					position: "relative",
				}}
			>
				{virtualItems.map((virtualItem) => {
					const item = tokenRows[virtualItem.index];
					return (
						<div
							key={item.id}
							style={{
								position: "absolute",
								top: 0,
								left: 0,
								width: "100%",
								transform: `translateY(${virtualItem.start}px)`,
								height: virtualItem.size,
								display: "flex",
								alignItems: "center",
								gap: "8px",
								fontFamily: "Menlo, monospace",
								fontSize: "14px",
							}}
						>
							<span style={{ color: "#38bdf8" }}>{`#${item.index + 1}`}</span>
							<span>{item.text}</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}
