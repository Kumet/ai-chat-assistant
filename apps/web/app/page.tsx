"use client";

import Link from "next/link";
import { useMemo } from "react";

export default function HomePage() {
	const sections = useMemo(
		() => [
			{
				title: "SSE ストリーム",
				description: "PR-02 でダミー実装予定",
				href: "#sse",
			},
			{
				title: "トークン/コストメーター",
				description: "PR-02 でダミー実装予定",
				href: "#meter",
			},
		],
		[],
	);

	return (
		<main style={{ padding: "2rem", display: "grid", gap: "1rem" }}>
			<h1>AI Chat Assistant Web</h1>
			<p>PR-01: モノレポ基盤の Next.js 雛形です。</p>
			<section>
				<h2>ロードマップ</h2>
				<ul>
					{sections.map((item) => (
						<li key={item.href}>
							<Link href={item.href}>{item.title}</Link>
							<p>{item.description}</p>
						</li>
					))}
				</ul>
			</section>
		</main>
	);
}
