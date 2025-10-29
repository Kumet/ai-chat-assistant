"""LangGraph/FSM style conversation state stub."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import List


class ConversationState(str, Enum):
    """Simple FSM states for future LangGraph integration."""

    IDLE = "idle"
    PLANNING = "planning"
    RESPONDING = "responding"
    COMPLETED = "completed"


@dataclass
class ConversationGraph:
    """Placeholder for a LangGraph or FSM style conversation manager.

    The implementation will be replaced when the actual planning/execution graph
    is introduced. For now it stores the history of visited states so tests and
    downstream code have a predictable contract to rely on.
    """

    history: List[ConversationState] = field(default_factory=lambda: [ConversationState.IDLE])

    def transition(self, next_state: ConversationState) -> None:
        """Record a state transition.

        Args:
            next_state: The state to transition into.
        """

        self.history.append(next_state)

    @property
    def current_state(self) -> ConversationState:
        """Return the most recent state."""

        return self.history[-1]
