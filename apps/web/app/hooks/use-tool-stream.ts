"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import {
	TOOL_STREAM_ENDPOINT,
	TOOL_STREAM_EVENT,
	type ToolStatus,
	type ToolStreamEvent,
} from "@ai-chat-assistant/shared";

import { parseSseChunk } from "../lib/sse";

export type ConversationTurn = {
	role: "user" | "assistant" | "system";
	content: string;
};

const DEFAULT_BASE_URL = "http://localhost:8001";

const resolveToolStreamUrl = (): string => {
	const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_BASE_URL;
	return `${base}${TOOL_STREAM_ENDPOINT}`;
};

type StreamStatus = "idle" | "connecting" | "streaming" | "completed" | "error";

export type ToolStreamStatus = StreamStatus;

export type UseToolStreamResult = {
	events: ToolStreamEvent[];
	status: StreamStatus;
	lastError: string | null;
	start: (conversation: ConversationTurn[]) => Promise<void>;
	cancel: () => void;
	isStreaming: boolean;
};

export const useToolStream = (): UseToolStreamResult => {
	const [events, setEvents] = useState<ToolStreamEvent[]>([]);
	const [status, setStatus] = useState<StreamStatus>("idle");
	const [lastError, setLastError] = useState<string | null>(null);
	const controllerRef = useRef<AbortController | null>(null);

	const cancel = useCallback(() => {
		if (controllerRef.current) {
			controllerRef.current.abort();
			controllerRef.current = null;
		}
		setStatus("idle");
	}, []);

	const start = useCallback(async (conversation: ConversationTurn[]) => {
		if (controllerRef.current) {
			controllerRef.current.abort();
		}

		const controller = new AbortController();
		controllerRef.current = controller;
		setEvents([]);
		setStatus("connecting");
		setLastError(null);

		const url = resolveToolStreamUrl();
		let response: Response;
		try {
			response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "text/event-stream",
				},
				body: JSON.stringify({ conversation }),
				signal: controller.signal,
			});
		} catch (error) {
			if (!controller.signal.aborted) {
				setStatus("error");
				setLastError(
					error instanceof Error ? error.message : "リクエストに失敗しました",
				);
				controllerRef.current = null;
			}
			return;
		}

		if (!response.ok || !response.body) {
			setStatus("error");
			setLastError(`API error: ${response.status}`);
			controllerRef.current = null;
			return;
		}

		setStatus("streaming");

		const reader = response.body.getReader();
		const decoder = new TextDecoder("utf-8");
		let buffer = "";
		let sawCompletion = false;
		let completionStatus: ToolStatus | null = null;

		const processBuffer = () => {
			let boundary = buffer.indexOf("\n\n");
			while (boundary !== -1) {
				const chunk = buffer.slice(0, boundary);
				buffer = buffer.slice(boundary + 2);
				const parsed = parseSseChunk(chunk);
				if (parsed?.data) {
					try {
						const event = JSON.parse(parsed.data) as ToolStreamEvent;
						setEvents((prev) => [...prev, event]);

						if (event.type === TOOL_STREAM_EVENT.tool) {
							const { stage, status: toolStatus, summary } = event.payload;
							if (stage === "completed") {
								sawCompletion = true;
								completionStatus = toolStatus;
								setStatus(toolStatus === "succeeded" ? "completed" : "error");
								if (toolStatus !== "succeeded" && summary) {
									setLastError(summary);
								}
							} else {
								setStatus("streaming");
							}
						} else if (event.type === TOOL_STREAM_EVENT.error) {
							sawCompletion = true;
							completionStatus = "failed";
							setStatus("error");
							setLastError(event.message);
						}
					} catch (error) {
						setStatus("error");
						setLastError(
							error instanceof Error
								? error.message
								: "SSEの解析に失敗しました",
						);
						controller.abort();
						return;
					}
				}
				boundary = buffer.indexOf("\n\n");
			}
		};

		try {
			while (true) {
				const { value, done } = await reader.read();
				if (done) {
					break;
				}
				buffer += decoder.decode(value, { stream: true });
				processBuffer();
			}
			buffer += decoder.decode();
			processBuffer();
		} catch (error) {
			if (!controller.signal.aborted) {
				setStatus("error");
				setLastError(
					error instanceof Error
						? error.message
						: "SSEストリームが中断されました",
				);
			}
		} finally {
			if (controllerRef.current === controller) {
				controllerRef.current = null;
			}
		}

		if (!sawCompletion && !controller.signal.aborted) {
			setStatus("error");
			setLastError("SSEストリームが完了前に終了しました");
		} else if (completionStatus === "succeeded") {
			setStatus("completed");
		} else if (completionStatus && completionStatus !== "succeeded") {
			setStatus("error");
			setLastError((prev) => prev ?? "pytest が失敗しました");
		}
	}, []);

	const isStreaming = useMemo(
		() => status === "connecting" || status === "streaming",
		[status],
	);

	return {
		events,
		status,
		lastError,
		start,
		cancel,
		isStreaming,
	};
};
