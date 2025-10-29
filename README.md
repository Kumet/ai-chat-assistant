# AI Chat Assistant Monorepo

PR-01 では Next.js / FastAPI ベースの最小モノレポ基盤を構築しています。

## ディレクトリ構成

- `apps/web` — Next.js 15 (App Router) のフロントエンド
- `apps/api` — FastAPI 3.12 ベースのバックエンド
- `packages/ui` — 共通 UI コンポーネント用パッケージ（プレースホルダー）
- `packages/shared` — 共通ドメイン型・ユーティリティ（プレースホルダー）

## セットアップ

### ローカル（ホスト実行）

1. Node.js 20 / pnpm 9 系、Python 3.12、`uv` CLI を用意
2. 依存関係をインストール

   ```bash
   pnpm install
   ```

3. `.env.example` をコピーして環境変数を設定

   ```bash
   cp .env.example .env.local
   ```

### Docker ベース開発

```bash
docker compose up --build web api
```

- `http://localhost:3000` (Next.js), `http://localhost:8001/healthz` (FastAPI) が立ち上がることを確認
- 停止は `Ctrl+C` → `docker compose down`
- ホスト側の API ポートは `HOST_API_PORT` 環境変数で変更可能（デフォルト: 8001）

### SSE デモの確認

1. API サーバー: `pnpm dev:api` または `HOST_API_PORT=8001 docker compose up api`
2. Web: `pnpm dev:web` を起動し `http://localhost:3000` へアクセス
3. 「受信トークン」セクションで SSE によるトークンストリームが次々に表示され、トークン／コストメーターが更新されることを確認
4. CLI から確認する場合は `curl -N http://localhost:8001/chat/stream` を実行し SSE の生データを閲覧

### Failing Test 実況ツールの確認

1. `docker compose up --build web api` または `pnpm dev:web` / `pnpm dev:api` で両方を起動
2. `http://localhost:3000` の「Failing Test ジェネレーター実況」セクションに会話プロンプト（例: `divide 関数のゼロ除算を検出して`）を入力し「実況開始」をクリック
3. UI 上で `event:token`（pytest ログ）と `event:tool`（ステージ進捗）が逐次表示され、「失敗 → 修正案 → 成功」の流れが実況されることを確認
4. API を直接確認する場合は以下のように `POST` で SSE を購読

   ```bash
   curl -N -H "Content-Type: application/json" -H "Accept: text/event-stream" \\
     -d '{"conversation":[{"role":"user","content":"divide 関数のゼロ除算テストが欲しい"}]}' \\
     http://localhost:8001/tools/tests/generate
   ```

   `event: tool` ではステージとステータス、`event: token` では pytest 実行ログが JSON で流れます。

### コスト/速度 SLO メーターの確認

1. `docker compose up --build web api` もしくは `pnpm dev:web` / `pnpm dev:api` を起動
2. チャット画面で SSE ストリームを開始すると、トークン/コストメーターの下に応答時間・使用トークン・キャッシュヒット率が表示されます
3. `/metrics/slo/latest` では最新の SLO 計測結果を JSON で取得でき、UI はこのエンドポイントをポーリングして閾値超過をアラート表示します

## よく使うコマンド

- フロント開発サーバー: `pnpm dev:web`
- API 開発サーバー: `pnpm dev:api`
- Lint（Next.js + Biome）: `pnpm lint`
- Web ビルド: `pnpm build`

### pre-commit

```bash
uv run -- pre-commit install
pre-commit run --all-files
```

- push 時には Ruff / Pytest も実行されます（`stages: [push]`）

### GitHub Actions (CI)

- `.github/workflows/ci.yml` が push/pr で `pnpm install`, `pnpm lint`, `uv sync`, `ruff`, `pytest` を実行
- キャッシュ: pnpm store / uv 仮想環境を再利用

### ブランチ運用例

1. `infra/dev-env` ブランチを作成し作業
2. Draft PR を作ってレビュー準備
3. `pre-commit run --all-files` → `docker compose up` で動作確認
4. CI（Actions）が緑になったらレビュー → 承認後マージ

## セキュリティとコスト

- `.env.example` には秘密情報を含めず、実値は `.env.local` にのみ配置してください。
- 現状はダミー構成のため外部 API 呼び出しや推論コストはありません。
- Turbo/Biome により lint/build のキャッシュが効き、後続 PR での CI 時間短縮が期待できます。
- SSE デモはダミーのトークン列とコスト見積もり（0.000002 USD/トークン）を用いており、実際の推論コストとは異なります。
- `/tools/tests/generate` は毎回テンポラリディレクトリを生成し、その中で pytest を実行するため利用者コードへの副作用はありません（CI と同一の `uv` 仮想環境を再利用）。
- `/metrics/slo/latest` は直近のリクエスト SLO を返すため、結果にはタイムスタンプやパス情報が含まれます。機微情報は含めませんが、必要に応じて認証の導入をご検討ください。
- `/graph/analyze` はリポジトリ内の関数・クラス名を返すため、プライベートリポジトリで利用する場合はアクセス制御に留意してください。

## AST グラフビューの確認

1. API を起動: `pnpm dev:api` または `HOST_API_PORT=8001 docker compose up api`
2. Web を起動: `pnpm dev:web` → `http://localhost:3000`
3. 「参照シンボル依存グラフ」で AST ベースのノード・エッジが描画され、ノードをクリックすると Monaco エディタが該当行へスクロールします
4. Cytoscape.js によりグラフを描画し、データソースは `/graph/analyze` の JSON レスポンスです

## テスト

- Web: `pnpm --filter web test`
- API: `uv run -- pytest`

## 次ステップ

- 実際のテストケース生成ロジック（LLM/RAG 連携）と修正パッチ適用パイプラインの導入
- TypeScript パーサーを用いた AST 解析の精度向上とシンボル解決
- SSE ログの履歴保存（Draft PR 連携、GitHub App でのコメント反映）
