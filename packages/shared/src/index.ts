export type HealthResponse = {
	status: "ok";
};

export const CHAT_STREAM_ENDPOINT = "/chat/stream";
export const GRAPH_ANALYSIS_ENDPOINT = "/graph/analyze";

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

export type SymbolKind = "function" | "class" | "module" | "unknown";

export type CodeSymbol = {
	id: string;
	name: string;
	filePath: string;
	kind: SymbolKind;
	line: number;
	column: number;
	source: string;
	sourceStartLine: number;
};

export type DependencyEdge = {
	source: string;
	target: string;
	label?: string;
};

export type AnalysisSummary = {
	symbols: CodeSymbol[];
	edges: DependencyEdge[];
};

export const TOOL_STREAM_ENDPOINT = "/tools/tests/generate";

export const TOOL_STREAM_EVENT = {
	token: "token",
	tool: "tool",
	error: "error",
} as const;

export type ToolStage =
	| "test_generation"
	| "pytest_initial_run"
	| "fix_application"
	| "pytest_rerun"
	| "completed";

export type ToolStatus = "pending" | "in_progress" | "failed" | "succeeded";

export type ToolTokenPayload = {
	stage: ToolStage;
	message: string;
	timestamp: string;
};

export type ToolStatusPayload = {
	stage: ToolStage;
	status: ToolStatus;
	summary?: string;
	timestamp: string;
};

export type ToolTokenEvent = {
	type: typeof TOOL_STREAM_EVENT.token;
	payload: ToolTokenPayload;
};

export type ToolStatusEvent = {
	type: typeof TOOL_STREAM_EVENT.tool;
	payload: ToolStatusPayload;
};

export type ToolErrorEvent = {
	type: typeof TOOL_STREAM_EVENT.error;
	message: string;
	timestamp: string;
};

export type ToolStreamEvent = ToolTokenEvent | ToolStatusEvent | ToolErrorEvent;

export const FIXIT_ENDPOINT = "/tools/fixit";

export type FixItTool = "eslint" | "ruff" | "black";

export type FixItStatus = "no_changes" | "created" | "failed";

export type FixItRequest = {
	tools?: FixItTool[];
	baseBranch?: string;
	push?: boolean;
	prTitle?: string;
	prBody?: string | null;
};

export type FixItResponse = {
	status: FixItStatus;
	branchName?: string | null;
	prUrl?: string | null;
	logs: string[];
	error?: string | null;
};
