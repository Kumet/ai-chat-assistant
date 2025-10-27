import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "AI Chat Assistant",
	description: "AI チャットアシスタントのモノレポ基盤",
};

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="ja">
			<body>{children}</body>
		</html>
	);
}
