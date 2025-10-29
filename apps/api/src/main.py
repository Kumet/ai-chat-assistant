from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import chat_router


def create_app() -> FastAPI:
    """FastAPI アプリケーションのファクトリ。"""
    app = FastAPI(
        title="AI Chat Assistant API",
        version="0.1.0",
        description="PR-01: モノレポ基盤用の FastAPI スタブ"
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
        allow_credentials=True,
    )

    app.include_router(chat_router)

    @app.get("/healthz", tags=["health"])
    async def health_check() -> dict[str, str]:
        """基本的な疎通確認用エンドポイント。"""
        return {"status": "ok"}

    return app


app = create_app()
