"""Request-scoped context — lets services read per-request data (e.g. client IP)
without threading it through every call site as an explicit parameter."""

from contextvars import ContextVar

_current_ip: ContextVar[str | None] = ContextVar("current_ip", default=None)


def set_current_ip(ip: str | None) -> None:
    _current_ip.set(ip)


def get_current_ip() -> str | None:
    return _current_ip.get()
