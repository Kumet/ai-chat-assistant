export type HealthResponse = {
	status: "ok";
};

export const CHAT_STREAM_ENDPOINT = "/chat/stream";

export const CHAT_STREAM_EVENT = {
	token: "token",
	completed: "completed",
	error: "error",
} as const;

export type ChatStreamUsage = {
	totalTokens: number;
	totalCostUsd: number;
};

export type ChatStreamTokenPayload = {
	id: string;
	token: string;
	index: number;
	timestamp: string;
};

export type ChatStreamTokenEvent = {
	type: typeof CHAT_STREAM_EVENT.token;
	payload: ChatStreamTokenPayload;
	usage: ChatStreamUsage;
};

export type ChatStreamCompletedEvent = {
	type: typeof CHAT_STREAM_EVENT.completed;
	usage: ChatStreamUsage;
};

export type ChatStreamErrorEvent = {
	type: typeof CHAT_STREAM_EVENT.error;
	message: string;
};

export type ChatStreamEvent =
	| ChatStreamTokenEvent
	| ChatStreamCompletedEvent
	| ChatStreamErrorEvent;
