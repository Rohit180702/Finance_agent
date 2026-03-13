"""
Checkpointer singleton.

main.py sets this at startup; graph.py reads it.
This avoids any circular import between main.py ↔ graph.py.
"""

_checkpointer = None


def set_checkpointer(cp) -> None:
    global _checkpointer
    _checkpointer = cp


def get_checkpointer():
    return _checkpointer
