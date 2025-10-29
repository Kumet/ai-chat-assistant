import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FixItPanel } from "./fixit-panel";

describe("FixItPanel", () => {
	beforeEach(() => {
		vi.spyOn(global, "fetch").mockResolvedValue(
			new Response(
				JSON.stringify({
					status: "created",
					branchName: "fixit/123",
					prUrl: "https://example.com/pr/1",
					logs: ["ok"],
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			),
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("runs FixIt and shows PR link on success", async () => {
		render(<FixItPanel />);

		const button = screen.getByRole("button", { name: "FixIt を実行する" });
		fireEvent.click(button);

		await waitFor(() =>
			expect(
				screen.getByRole("link", { name: "Draft PR を開く" }),
			).toBeInTheDocument(),
		);
	});

	it("shows error message on failure", async () => {
		vi.spyOn(global, "fetch").mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					status: "failed",
					error: "GITHUB_TOKEN is not set",
					logs: ["error"],
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			),
		);

		render(<FixItPanel />);

		const button = screen.getByRole("button", { name: "FixIt を実行する" });
		fireEvent.click(button);

		await waitFor(() =>
			expect(screen.getByText("GITHUB_TOKEN is not set")).toBeInTheDocument(),
		);
	});
});
