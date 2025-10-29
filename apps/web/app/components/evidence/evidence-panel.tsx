"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

import type { AnalysisSummary, CodeSymbol } from "@ai-chat-assistant/shared";
import Editor from "@monaco-editor/react";
import type {
	Core as CytoscapeCore,
	ElementDefinition,
	EventObjectNode,
} from "cytoscape";
import type { editor as MonacoEditor } from "monaco-editor";
import CytoscapeComponent from "react-cytoscapejs";

import styles from "./evidence-panel.module.css";

type EvidencePanelProps = {
	analysis: AnalysisSummary;
};

export function EvidencePanel({ analysis }: EvidencePanelProps) {
	const [selected, setSelected] = useState<CodeSymbol | null>(
		analysis.symbols[0] ?? null,
	);
	const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
	const cyRef = useRef<CytoscapeCore | null>(null);

	const elements = useMemo<ElementDefinition[]>(
		() => [
			...analysis.symbols.map((symbol) => ({
				data: {
					id: symbol.id,
					label: symbol.name,
				},
			})),
			...analysis.edges.map((edge, index) => ({
				data: {
					id: `${edge.source}-${edge.target}-${index}`,
					source: edge.source,
					target: edge.target,
					label: edge.label ?? "",
				},
			})),
		],
		[analysis.edges, analysis.symbols],
	);

	useEffect(() => {
		const cy = cyRef.current;
		if (!cy) return;
		const handler = (event: EventObjectNode) => {
			const id = event.target.data("id") as string;
			const symbol = analysis.symbols.find((item) => item.id === id);
			if (symbol) {
				setSelected(symbol);
			}
		};
		cy.on("tap", "node", handler);
		return () => {
			cy.off("tap", "node", handler);
		};
	}, [analysis.symbols]);

	useEffect(() => {
		const cy = cyRef.current;
		if (!cy) return;
		if (analysis.symbols.length === 0) return;
		const elementsApi =
			typeof cy.elements === "function" ? cy.elements() : null;
		if (!elementsApi || typeof elementsApi.layout !== "function") {
			return;
		}
		const layout = elementsApi.layout({ name: "cose", animate: false });
		if (!layout || typeof layout.run !== "function") {
			return;
		}
		layout.run();
		return () => {
			if (
				typeof layout.stop === "function" &&
				!(typeof cy.destroyed === "function" && cy.destroyed())
			) {
				layout.stop();
			}
		};
	}, [analysis.symbols.length]);

	useEffect(() => {
		return () => {
			const cy = cyRef.current;
			if (cy && typeof cy.destroy === "function" && !cy.destroyed?.()) {
				cy.destroy();
			}
			cyRef.current = null;
		};
	}, []);

	useEffect(() => {
		if (!selected || !editorRef.current) {
			return;
		}

		const relativeLine = selected.line - (selected.sourceStartLine ?? 1) + 1;
		editorRef.current.revealLineInCenter(Math.max(relativeLine, 1));
	}, [selected]);

	return (
		<div className={styles.wrapper}>
			<div className={styles.graphColumn}>
				<CytoscapeComponent
					cy={(instance) => {
						if (!instance) {
							return;
						}
						cyRef.current = instance;
					}}
					layout={{ name: "cose" }}
					elements={elements}
					style={{ width: "100%", height: "100%" }}
				/>
			</div>
			<div className={styles.viewerColumn}>
				<div className={styles.metaPanel}>
					<h2 className={styles.title}>{selected?.name ?? "No symbol"}</h2>
					<p className={styles.meta}>{selected?.filePath ?? ""}</p>
				</div>
				<Editor
					height="100%"
					language={
						selected?.filePath.endsWith(".py") ? "python" : "typescript"
					}
					value={selected?.source ?? ""}
					onMount={(editor) => {
						editorRef.current = editor;
					}}
					options={{
						readOnly: true,
						minimap: { enabled: false },
						scrollBeyondLastLine: false,
					}}
				/>
			</div>
		</div>
	);
}
