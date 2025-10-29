import { describe, expect, it } from "vitest";

import { parseSseChunk } from "./sse";

describe("parseSseChunk", () => {
	it("parses event and data fields", () => {
		const chunk = 'event: tool\ndata: {"hello": "world"}\n\n';
		const result = parseSseChunk(chunk);
		expect(result).toEqual({
			event: "tool",
			data: '{"hello": "world"}',
		});
	});

	it("joins multiple data lines preserving newlines", () => {
		const chunk = "data: line1\ndata: line2\n\n";
		const result = parseSseChunk(chunk);
		expect(result).toEqual({
			data: "line1\nline2",
		});
	});

	it("ignores comments and blank lines", () => {
		const chunk = ":comment\nevent: token\n\n";
		const result = parseSseChunk(chunk);
		expect(result).toEqual({
			event: "token",
		});
	});
});
