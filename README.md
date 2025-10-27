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

- `http://localhost:3000` (Next.js), `http://localhost:8000/healthz` (FastAPI) が立ち上がることを確認
- 停止は `Ctrl+C` → `docker compose down`

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

## 次ステップ

- PR-02: Web SSE ダミー UI の実装
- PR-03: `/chat/stream` SSE スタブと FSM 構成
- PR-04: Lint/Format/テスト/CI スケルトン
