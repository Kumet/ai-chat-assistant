from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

FixItTool = Literal["eslint", "ruff", "black"]
FixItStatus = Literal["no_changes", "created", "failed"]


class FixItRequestModel(BaseModel):
    tools: list[FixItTool] = Field(
        default_factory=lambda: ["eslint", "ruff", "black"],
        description="実行する FixIt ツールの一覧",
    )
    base_branch: str = Field(
        "main",
        alias="baseBranch",
        description="FixIt 実行時にチェックアウトするベースブランチ",
    )
    push: bool = Field(True, description="origin へブランチを push するかどうか")
    pr_title: str = Field(
        "chore: apply lint auto-fixes",
        alias="prTitle",
        description="Draft PR のタイトル",
    )
    pr_body: str | None = Field(
        default=None,
        alias="prBody",
        description="Draft PR の本文",
    )

    model_config = {
        "populate_by_name": True,
    }


class FixItResponseModel(BaseModel):
    status: FixItStatus = Field(description="FixIt 実行結果のステータス")
    branch_name: str | None = Field(
        default=None,
        alias="branchName",
        description="作成されたブランチ名",
    )
    pr_url: str | None = Field(
        default=None,
        alias="prUrl",
        description="Draft PR の URL",
    )
    logs: list[str] = Field(default_factory=list, description="FixIt 実行ログ")
    error: str | None = Field(
        default=None,
        description="失敗時のエラーメッセージ",
    )

    model_config = {
        "populate_by_name": True,
    }
