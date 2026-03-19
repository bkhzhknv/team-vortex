from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol


@dataclass(slots=True)
class DetectorSignal:
    detector_name: str
    event_type: str
    severity: str
    confidence: float
    metadata: dict = field(default_factory=dict)


class DetectorPlugin(Protocol):
    name: str

    def detect(self, frame, observations: list[dict]) -> list[DetectorSignal]:
        ...


class DetectorRegistry:
    def __init__(self):
        self._plugins: list[DetectorPlugin] = []

    def register(self, plugin: DetectorPlugin) -> None:
        self._plugins.append(plugin)

    def detect(self, frame, observations: list[dict]) -> list[DetectorSignal]:
        signals: list[DetectorSignal] = []
        for plugin in self._plugins:
            signals.extend(plugin.detect(frame, observations))
        return signals
