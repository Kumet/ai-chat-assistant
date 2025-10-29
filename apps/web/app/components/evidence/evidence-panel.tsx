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
    analysis.symbols[0] ?? null
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
    [analysis.edges, analysis.symbols]
  );

  // ノードタップで選択更新
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed?.()) return;

    const handler = (event: EventObjectNode) => {
      if (cy.destroyed?.()) return;
      const id = event.target.data("id") as string;
      const symbol = analysis.symbols.find((item) => item.id === id);
      if (symbol) setSelected(symbol);
    };

    cy.on("tap", "node", handler);
    return () => {
      if (!cy.destroyed?.()) cy.off("tap", "node", handler);
    };
  }, [analysis.symbols]);

  // elements 変更のたびにレイアウト実行（renderer が生きているときだけ）
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed?.()) return;
    const hasRenderer =
      typeof (cy as any).renderer === "function" && (cy as any).renderer();
    if (!hasRenderer) return;
    if (analysis.symbols.length === 0) return;

    const layout = cy.elements().layout({ name: "cose", animate: false });
    layout?.run?.();

    return () => {
      if (!cy.destroyed?.()) layout?.stop?.();
    };
    // elements の実体が変わったタイミングで確実に再レイアウト
  }, [elements, analysis.symbols.length]);

  // アンマウント時は必ず destroy（破棄後の notify を防ぐ）
  useEffect(() => {
    return () => {
      try {
        cyRef.current?.destroy?.();
      } catch {
        /* noop */
      }
      cyRef.current = null;
    };
  }, []);

  // エディタで対象行へスクロール
  useEffect(() => {
    if (!selected || !editorRef.current) return;
    const relativeLine = selected.line - (selected.sourceStartLine ?? 1) + 1;
    editorRef.current.revealLineInCenter(Math.max(relativeLine, 1));
  }, [selected]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.graphColumn}>
        <CytoscapeComponent
          cy={(instance) => {
            if (!instance) return;
            cyRef.current = instance;
          }}
          // layout は useEffect で実行する（重複実行を避ける）
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
          language={selected?.filePath.endsWith(".py") ? "python" : "typescript"}
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