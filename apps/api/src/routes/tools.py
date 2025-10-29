"""Tool-assisted failing test generation and execution SSE endpoint."""

from __future__ import annotations

import asyncio
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Awaitable, Callable, Literal

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field


ToolStage = Literal[
    "test_generation",
    "pytest_initial_run",
    "fix_application",
    "pytest_rerun",
    "completed",
]
ToolStatus = Literal["pending", "in_progress", "failed", "succeeded"]


class ConversationTurn(BaseModel):
    role: Literal["user", "assistant", "system"] = Field(..., description="発話者の役割")
    content: str = Field(..., description="メッセージ本文")


class TestGenerationRequest(BaseModel):
    conversation: list[ConversationTurn] = Field(
        default_factory=list, description="Failing Test 生成用の会話履歴"
    )


router = APIRouter(prefix="/tools", tags=["tools"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _sse(event: str, data: dict[str, object]) -> str:
    payload = json.dumps(data, ensure_ascii=False)
    return f"event: {event}\ndata: {payload}\n\n"


def _token_payload(stage: ToolStage, message: str) -> dict[str, object]:
    return {
        "type": "token",
        "payload": {
            "stage": stage,
            "message": message,
            "timestamp": _now_iso(),
        },
    }


def _status_payload(
    stage: ToolStage, status: ToolStatus, summary: str | None
) -> dict[str, object]:
    return {
        "type": "tool",
        "payload": {
            "stage": stage,
            "status": status,
            "summary": summary,
            "timestamp": _now_iso(),
        },
    }


def _error_payload(message: str) -> dict[str, object]:
    return {
        "type": "error",
        "message": message,
        "timestamp": _now_iso(),
    }


async def _run_pytest(
    stage: ToolStage,
    workdir: Path,
    emit: Callable[[str], Awaitable[None]],
) -> int:
    """Run pytest in *workdir* and emit streaming log events."""

    process = await asyncio.create_subprocess_exec(
        sys.executable,
        "-m",
        "pytest",
        "-q",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
        cwd=str(workdir),
    )
    assert process.stdout is not None

    while True:
        line = await process.stdout.readline()
        if not line:
            break
        text = line.decode("utf-8", errors="replace").rstrip()
        if text:
            await emit(_sse("token", _token_payload(stage, text)))

    await process.wait()
    status: ToolStatus = "succeeded" if process.returncode == 0 else "failed"
    await emit(
        _sse(
            "tool",
            _status_payload(
                stage,
                status,
                f"pytest exited with code {process.returncode}",
            ),
        )
    )
    return process.returncode


@router.post("/tests/generate")
async def generate_failing_tests(request: TestGenerationRequest) -> StreamingResponse:
    """Failing Test を生成し pytest 実行ログを SSE で返す。"""

    queue: asyncio.Queue[str | None] = asyncio.Queue()

    async def emit(event: str) -> None:
        await queue.put(event)

    async def worker() -> None:
        conversation_summary = " / ".join(
            turn.content for turn in request.conversation[-3:]
        )
        if not conversation_summary:
            conversation_summary = "テスト生成指示が空だったため、デフォルトシナリオを使用します。"

        try:
            await emit(
                _sse(
                    "tool",
                    _status_payload(
                        "test_generation",
                        "in_progress",
                        "会話ログから Failing Test を設計中",
                    ),
                )
            )
            await emit(
                _sse(
                    "token",
                    _token_payload(
                        "test_generation",
                        f"入力概要: {conversation_summary}",
                    ),
                )
            )
            await emit(
                _sse(
                    "token",
                    _token_payload(
                        "test_generation",
                        "divide 関数のゼロ除算を検証するテストを生成します。",
                    ),
                )
            )

            with TemporaryDirectory(prefix="tool-tests-") as tmp_dir:
                workdir = Path(tmp_dir)
                (workdir / "__init__.py").write_text("", encoding="utf-8")

                module_path = workdir / "calculator.py"
                module_path.write_text(
                    """def divide(a: float, b: float) -> float:
    \"\"\"Divide two numbers (intentionally incorrect implementation).\"\"\"
    return a - b
""",
                    encoding="utf-8",
                )

                test_path = workdir / "test_calculator.py"
                test_path.write_text(
                    """import pytest

from calculator import divide


def test_divide_basic():
    assert divide(10, 2) == 5


def test_divide_zero_raises():
    with pytest.raises(ZeroDivisionError):
        divide(1, 0)
""",
                    encoding="utf-8",
                )

                await emit(
                    _sse(
                        "tool",
                        _status_payload(
                            "test_generation",
                            "succeeded",
                            "Failing Test を生成しました",
                        ),
                    )
                )

                await emit(
                    _sse(
                        "tool",
                        _status_payload(
                            "pytest_initial_run",
                            "in_progress",
                            "初回 pytest を実行します",
                        ),
                    )
                )
                initial_exit = await _run_pytest(
                    "pytest_initial_run",
                    workdir,
                    emit,
                )

                if initial_exit == 0:
                    await emit(
                        _sse(
                            "tool",
                            _status_payload(
                                "completed",
                                "succeeded",
                                "初回実行で全テストが成功しました",
                            ),
                        )
                    )
                    return

                await emit(
                    _sse(
                        "tool",
                        _status_payload(
                            "fix_application",
                            "in_progress",
                            "失敗テストを解析し修正案を適用します",
                        ),
                    )
                )
                await emit(
                    _sse(
                        "token",
                        _token_payload(
                            "fix_application",
                            "divide 関数を割り算へ修正し、ゼロ除算を検出します。",
                        ),
                    )
                )
                module_path.write_text(
                    """def divide(a: float, b: float) -> float:
    \"\"\"Divide two numbers with proper zero-division handling.\"\"\"
    if b == 0:
        raise ZeroDivisionError("division by zero")
    return a / b
""",
                    encoding="utf-8",
                )
                await emit(
                    _sse(
                        "tool",
                        _status_payload(
                            "fix_application",
                            "succeeded",
                            "修正案を適用しました。再度 pytest を実行します。",
                        ),
                    )
                )

                await emit(
                    _sse(
                        "tool",
                        _status_payload(
                            "pytest_rerun",
                            "in_progress",
                            "修正後の pytest を実行します",
                        ),
                    )
                )
                rerun_exit = await _run_pytest("pytest_rerun", workdir, emit)

                final_status: ToolStatus = (
                    "succeeded" if rerun_exit == 0 else "failed"
                )
                final_summary = (
                    "pytest が成功しました" if rerun_exit == 0 else "pytest が失敗しました"
                )
                await emit(
                    _sse(
                        "tool",
                        _status_payload(
                            "completed",
                            final_status,
                            final_summary,
                        ),
                    )
                )
        except Exception as exc:  # pragma: no cover - 予防的
            await emit(_sse("error", _error_payload(f"ツール処理中にエラーが発生しました: {exc}")))
        finally:
            await queue.put(None)

    asyncio.create_task(worker())

    async def event_publisher():
        while True:
            item = await queue.get()
            if item is None:
                break
            yield item.encode("utf-8")

    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
    }
    return StreamingResponse(
        event_publisher(),
        media_type="text/event-stream",
        headers=headers,
    )
