"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
	CHAT_STREAM_ENDPOINT,
	CHAT_STREAM_EVENT,
	type ChatStreamEvent,
	type ChatStreamTokenEvent,
	type ChatStreamUsage,
	SLO_METRICS_ENDPOINT,
	type SloMetric,
	type SloMetricsResponse,
} from "@ai-chat-assistant/shared";

type StreamStatus = "idle" | "connecting" | "streaming" | "completed" | "error";

const DEFAULT_BASE_URL = "http://localhost:8001";

const resolveStreamUrl = (): string => {
	const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_BASE_URL;
	return `${base}${CHAT_STREAM_ENDPOINT}`;
};

const resolveSloUrl = (path: string): string => {
	const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_BASE_URL;
	const url = new URL(`${base}${SLO_METRICS_ENDPOINT}`);
	url.searchParams.set("path", path);
	url.searchParams.set("limit", "1");
	return url.toString();
};

export type UseChatStreamResult = {
	events: ChatStreamEvent[];
	tokens: ChatStreamTokenEvent[];
	usage: ChatStreamUsage | null;
	status: StreamStatus;
	lastError: string | null;
	restart: () => void;
	sloMetric: SloMetric | null;
};

export const useChatStream = (): UseChatStreamResult => {
	const [events, setEvents] = useState<ChatStreamEvent[]>([]);
	const [status, setStatus] = useState<StreamStatus>("idle");
	const [lastError, setLastError] = useState<string | null>(null);
	const [sloMetric, setSloMetric] = useState<SloMetric | null>(null);
	const sourceRef = useRef<EventSource | null>(null);

	const fetchLatestSlo = useCallback(async () => {
		try {
			const response = await fetch(resolveSloUrl("/chat/stream"));
			if (!response.ok) {
				return;
			}
			const data = (await response.json()) as SloMetricsResponse;
			setSloMetric(data.records[0] ?? null);
		} catch (error) {
			console.warn("Failed to load SLO metrics", error);
		}
	}, []);

	const startStream = useCallback(() => {
		if (sourceRef.current) {
			sourceRef.current.close();
		}
		setStatus("connecting");
		setLastError(null);
		setEvents([]);
		setSloMetric(null);

		const url = resolveStreamUrl();
		const eventSource = new EventSource(url);
		eventSource.onopen = () => {
			setStatus("streaming");
		};
		eventSource.onmessage = (event) => {
			try {
				const parsed = JSON.parse(event.data) as ChatStreamEvent;
				setEvents((prev) => [...prev, parsed]);
				if (parsed.type === CHAT_STREAM_EVENT.completed) {
					setStatus("completed");
					eventSource.close();
					sourceRef.current = null;
					void fetchLatestSlo();
				}
			} catch (error) {
				setLastError(
					error instanceof Error ? error.message : "unknown parse error",
				);
				setStatus("error");
			}
		};
		eventSource.onerror = () => {
			setStatus("error");
			setLastError("SSE connection lost");
			eventSource.close();
			sourceRef.current = null;
		};

		sourceRef.current = eventSource;
	}, [fetchLatestSlo]);

	useEffect(() => {
		startStream();
		return () => {
			if (sourceRef.current) {
				sourceRef.current.close();
			}
		};
	}, [startStream]);

	const tokens = useMemo(
		() =>
			events.filter(
				(event): event is ChatStreamTokenEvent =>
					event.type === CHAT_STREAM_EVENT.token,
			),
		[events],
	);

	const usage: ChatStreamUsage | null = useMemo(() => {
		for (let i = events.length - 1; i >= 0; i -= 1) {
			const event = events[i];
			if ("usage" in event && event.usage) {
				return event.usage;
			}
		}
		return null;
	}, [events]);

	return {
		events,
		tokens,
		usage,
		status,
		lastError,
		restart: startStream,
		sloMetric,
	};
};
