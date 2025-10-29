import { render, screen } from "@testing-library/react";
import React from "react";

import type { SloMetric } from "@ai-chat-assistant/shared";

import { SloMeter } from "./slo-meter";

const metric: SloMetric = {
	method: "GET",
	path: "/chat/stream",
	durationMs: 1500,
	tokens: 80,
	cacheHit: true,
	timestamp: new Date("2025-01-01T00:00:00Z").toISOString(),
};

describe("SloMeter", () => {
	it("renders metric values", () => {
		render(<SloMeter metric={metric} />);
		expect(screen.getByText("1500 ms")).toBeInTheDocument();
		expect(screen.getByText("80")).toBeInTheDocument();
		expect(screen.getByText("HIT")).toBeInTheDocument();
	});

	it("shows fallback when metric is null", () => {
		render(<SloMeter metric={null} />);
		expect(
			screen.getByText("最新の SLO データを取得しています…"),
		).toBeInTheDocument();
	});
});
