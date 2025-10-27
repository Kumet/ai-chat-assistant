from fastapi import FastAPI


def create_app() -> FastAPI:
    """FastAPI アプリケーションのファクトリ。"""
    app = FastAPI(
        title="AI Chat Assistant API",
        version="0.1.0",
        description="PR-01: モノレポ基盤用の FastAPI スタブ"
    )

    @app.get("/healthz", tags=["health"])
    async def health_check() -> dict[str, str]:
        """基本的な疎通確認用エンドポイント。"""
        return {"status": "ok"}

    return app


app = create_app()
