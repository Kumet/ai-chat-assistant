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

- PR-02: Web SSE ダミー UI の実装
- PR-03: `/chat/stream` SSE スタブと FSM 構成
- PR-04: Lint/Format/テスト/CI スケルトン
