from __future__ import annotations

import asyncio
import os
import shlex
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence
from urllib.parse import urlparse

import httpx

from ..models.fixit import FixItRequestModel, FixItStatus

PROJECT_ROOT = Path(__file__).resolve().parents[3]
API_DIRECTORY = PROJECT_ROOT / "apps" / "api"


class FixItError(RuntimeError):
    """内部エラーを表す例外。"""


@dataclass
class FixItResult:
    status: FixItStatus
    logs: list[str] = field(default_factory=list)
    branch_name: str | None = None
    pr_url: str | None = None
    error: str | None = None


class FixItRunner:
    """ESLint / Ruff / Black を実行し Draft PR を作成するユーティリティ。"""

    def __init__(self, request: FixItRequestModel) -> None:
        self.request = request
        self.project_root = PROJECT_ROOT
        self.api_directory = API_DIRECTORY
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        self.branch_name = f"fixit/{timestamp}"
        self.base_branch = request.base_branch
        self.logs: list[str] = []
        self.branch_created = False
        self.delete_branch_on_cleanup = False

    def _log(self, message: str) -> None:
        self.logs.append(message)

    async def _run_command(
        self,
        cmd: Sequence[str],
        *,
        cwd: Path | None = None,
        check: bool = True,
        log_output: bool = True,
    ) -> str:
        command_repr = " ".join(shlex.quote(part) for part in cmd)
        self._log(f"$ {command_repr}")

        process = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=str(cwd or self.project_root),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout_bytes, stderr_bytes = await process.communicate()
        stdout = stdout_bytes.decode().strip()
        stderr = stderr_bytes.decode().strip()

        if stdout and log_output:
            for line in stdout.splitlines():
                self._log(line)
        if stderr and log_output:
            for line in stderr.splitlines():
                self._log(line)

        if check and process.returncode != 0:
            raise FixItError(
                f"Command '{command_repr}' exited with code {process.returncode}"
            )

        return stdout

    async def _ensure_clean_worktree(self) -> None:
        status_output = await self._run_command(
            ["git", "status", "--porcelain"],
            log_output=False,
        )
        if status_output.strip():
            raise FixItError(
                "作業ツリーに未コミットの変更が存在します。FixIt を実行する前にクリーンな状態にしてください。"
            )

    async def _current_branch(self) -> str:
        return await self._run_command(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            log_output=False,
        )

    async def _checkout_base_branch(self) -> None:
        current = await self._current_branch()
        if current != self.base_branch:
            await self._run_command(["git", "checkout", self.base_branch])

    async def _create_feature_branch(self) -> None:
        await self._run_command(["git", "checkout", "-b", self.branch_name])
        self.branch_created = True

    async def _run_tools(self) -> None:
        tools = set(self.request.tools)
        if "eslint" in tools:
            await self._run_command(
                ["pnpm", "--filter", "web", "lint", "--", "--fix"],
                cwd=self.project_root,
            )
        if "ruff" in tools:
            await self._run_command(
                ["uv", "run", "--", "ruff", "check", "--fix", "."],
                cwd=self.api_directory,
            )
        if "black" in tools:
            await self._run_command(
                ["uv", "run", "--", "black", "."],
                cwd=self.api_directory,
            )

    async def _has_changes(self) -> bool:
        status_output = await self._run_command(
            ["git", "status", "--porcelain"],
            log_output=False,
        )
        return bool(status_output.strip())

    async def _stage_changes(self) -> None:
        await self._run_command(["git", "add", "--all"])

    async def _commit_changes(self) -> None:
        await self._run_command(["git", "commit", "-m", self.request.pr_title])

    async def _push_branch(self) -> None:
        await self._run_command(
            ["git", "push", "-u", "origin", self.branch_name],
        )

    async def _restore_base_branch(self) -> None:
        try:
            await self._run_command(
                ["git", "checkout", self.base_branch],
                check=True,
            )
        except FixItError as error:
            # 取得できない場合はログに残すのみ
            self._log(str(error))

    async def _delete_branch(self) -> None:
        await self._run_command(
            ["git", "branch", "-D", self.branch_name],
            check=False,
        )

    async def _create_draft_pr(self) -> str:
        token = os.getenv("GITHUB_TOKEN") or os.getenv("FIXIT_GITHUB_TOKEN")
        if not token:
            raise FixItError(
                "GITHUB_TOKEN (または FIXIT_GITHUB_TOKEN) が設定されていません。"
            )

        remote_url = await self._run_command(
            ["git", "config", "--get", "remote.origin.url"],
            log_output=False,
        )
        repo_slug = self._extract_repo_slug(remote_url.strip())

        payload = {
            "title": self.request.pr_title,
            "head": self.branch_name,
            "base": self.base_branch,
            "body": self._build_pr_body(),
            "draft": True,
        }
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
        }

        async with httpx.AsyncClient(timeout=httpx.Timeout(60.0)) as client:
            response = await client.post(
                f"https://api.github.com/repos/{repo_slug}/pulls",
                json=payload,
                headers=headers,
            )

        if response.status_code >= 400:
            raise FixItError(
                f"GitHub API でエラーが発生しました: {response.status_code} {response.text}"
            )

        data = response.json()
        pr_url = data.get("html_url")
        if not pr_url:
            raise FixItError("作成された PR の URL を取得できませんでした。")
        self._log(f"Draft PR created: {pr_url}")
        return pr_url

    def _extract_repo_slug(self, remote_url: str) -> str:
        if remote_url.startswith("git@"):
            _, path = remote_url.split(":", 1)
        else:
            parsed = urlparse(remote_url)
            path = parsed.path.lstrip("/")
        if path.endswith(".git"):
            path = path[:-4]
        if "/" not in path:
            raise FixItError(
                f"remote.origin.url ({remote_url}) からリポジトリ名を解析できませんでした。"
            )
        return path

    def _build_pr_body(self) -> str:
        if self.request.pr_body is not None:
            return self.request.pr_body
        tool_labels = {
            "eslint": "ESLint --fix",
            "ruff": "Ruff --fix",
            "black": "Black",
        }
        lines = [
            "## FixIt Summary",
            "",
            "The FixIt automation executed the following tools:",
        ]
        for tool in self.request.tools:
            label = tool_labels.get(tool, tool)
            lines.append(f"- {label}")
        lines.extend(
            [
                "",
                "This PR was generated automatically by the FixIt workflow.",
            ]
        )
        return "\n".join(lines)

    async def execute(self) -> FixItResult:
        result: FixItResult
        try:
            await self._checkout_base_branch()
            await self._ensure_clean_worktree()
            await self._create_feature_branch()
            await self._run_tools()
            if not await self._has_changes():
                self.delete_branch_on_cleanup = True
                result = FixItResult(
                    status="no_changes",
                    logs=list(self.logs),
                )
            else:
                await self._stage_changes()
                await self._commit_changes()
                pr_url: str | None = None
                if self.request.push:
                    await self._push_branch()
                    pr_url = await self._create_draft_pr()
                result = FixItResult(
                    status="created",
                    branch_name=self.branch_name,
                    pr_url=pr_url,
                    logs=list(self.logs),
                )
        except FixItError as error:
            self._log(str(error))
            result = FixItResult(
                status="failed",
                error=str(error),
                logs=list(self.logs),
            )
            self.delete_branch_on_cleanup = True
        finally:
            await self._restore_base_branch()
            if self.branch_created and self.delete_branch_on_cleanup:
                await self._delete_branch()

        return result
