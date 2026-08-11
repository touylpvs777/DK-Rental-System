"""
Lightweight in-process async event bus for domain events.

Deliberately minimal: an event name is just a string ("rental.activated"),
subscribers are async callables registered via `subscribe()`, and `emit()`
awaits each of them in turn. A handler's failure is logged and swallowed —
a broken notification must never roll back or fail the business action that
triggered it.

Not tied to FastAPI's request lifecycle (no `BackgroundTasks`), so it works
the same whether called from a route, a service method, or a scheduled job
(APScheduler, in later steps) that has no HTTP request context at all.
"""
import logging
from collections import defaultdict
from collections.abc import Awaitable, Callable
from typing import Any

logger = logging.getLogger("app.events")

EventHandler = Callable[..., Awaitable[None]]


class EventBus:
    def __init__(self) -> None:
        self._subscribers: dict[str, list[EventHandler]] = defaultdict(list)

    def subscribe(self, event_name: str, handler: EventHandler) -> None:
        self._subscribers[event_name].append(handler)

    async def emit(self, event_name: str, **payload: Any) -> None:
        for handler in self._subscribers.get(event_name, []):
            try:
                await handler(**payload)
            except Exception:
                logger.exception("Event handler %r failed for event %r", handler, event_name)


event_bus = EventBus()
