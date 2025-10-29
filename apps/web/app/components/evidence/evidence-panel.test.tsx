import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ElementDefinition } from "cytoscape";

import type { AnalysisSummary } from "@ai-chat-assistant/shared";
import { EvidencePanel } from "./evidence-panel";

vi.mock("react-cytoscapejs", () => {
	return {
		default: ({
			cy,
			elements,
		}: {
			cy: (instance: {
				on: (
					event: string,
					selector: string,
					handler: (payload: { target: { data: () => string } }) => void,
				) => void;
				off: (
					event: string,
					selector: string,
					handler: (payload: { target: { data: () => string } }) => void,
				) => void;
			}) => void;
			elements: ElementDefinition[];
		}) => {
			const handlers: Record<
				string,
				(payload: { target: { data: () => string } }) => void
			> = {};
			cy({
				on: (
					_event: string,
					_selector: string,
					handler: (payload: { target: { data: () => string } }) => void,
				) => {
					handlers.tap = handler;
				},
				off: () => {},
			});

			const nodes = elements.filter(
				(
					element,
				): element is ElementDefinition & {
					data: { id: string; label?: string };
				} => !("source" in element.data),
			);
			return (
				<div>
					{nodes
						.filter((element) => element.data?.label)
						.map((element) => (
							<button
								type="button"
								key={element.data.id}
								onClick={() =>
									handlers.tap?.({
										target: { data: () => element.data.id },
									})
								}
							>
								{element.data.label}
							</button>
						))}
				</div>
			);
		},
	};
});

const revealLineInCenter = vi.fn();

vi.mock("@monaco-editor/react", () => {
	const React = require("react");
	const { useEffect } = React;
	type MockEditorProps = {
		onMount: (editor: {
			revealLineInCenter: typeof revealLineInCenter;
			getModel: () => { getValue: () => string };
		}) => void;
		value: string;
	};

	const MockEditor = ({ onMount, value }: MockEditorProps) => {
		useEffect(() => {
			onMount({
				revealLineInCenter,
				getModel: () => ({ getValue: () => value }),
			});
		}, [onMount, value]);
		return <div data-testid="monaco-mock">{value}</div>;
	};
	return {
		__esModule: true,
		default: MockEditor,
	};
});

const analysis: AnalysisSummary = {
	symbols: [
		{
			id: "symbol-1",
			name: "exampleFunction",
			filePath: "apps/api/src/example.py",
			kind: "function",
			line: 42,
			column: 0,
			source: "def exampleFunction():\n    return True\n",
			sourceStartLine: 41,
		},
	],
	edges: [],
};

describe("EvidencePanel", () => {
	beforeEach(() => {
		revealLineInCenter.mockReset();
	});

	it("scrolls Monaco editor to symbol line when graph node clicked", async () => {
		render(<EvidencePanel analysis={analysis} />);

		const nodeButton = screen.getByRole("button", { name: "exampleFunction" });
		fireEvent.click(nodeButton);

		expect(revealLineInCenter).toHaveBeenCalled();
	});
});
