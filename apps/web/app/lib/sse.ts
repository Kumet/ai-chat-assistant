export type ParsedSseChunk = {
	event?: string;
	data?: string;
};

export const parseSseChunk = (chunk: string): ParsedSseChunk | null => {
	const trimmed = chunk.trim();
	if (!trimmed) {
		return null;
	}
	const message: ParsedSseChunk = {};
	const lines = trimmed.split(/\r?\n/);
	for (const line of lines) {
		if (!line || line.startsWith(":")) {
			continue;
		}
		const separator = line.indexOf(":");
		if (separator === -1) {
			continue;
		}
		const field = line.slice(0, separator);
		const value = line.slice(separator + 1).trimStart();
		if (field === "event") {
			message.event = value;
		} else if (field === "data") {
			message.data = message.data ? `${message.data}\n${value}` : value;
		}
	}
	return message;
};
