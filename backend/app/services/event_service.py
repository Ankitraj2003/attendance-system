import asyncio
import json
from typing import Set, Dict, Any

class EventBroadcaster:
    def __init__(self):
        self._listeners: Set[asyncio.Queue] = set()

    async def subscribe(self) -> asyncio.Queue:
        queue = asyncio.Queue()
        self._listeners.add(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue):
        self._listeners.discard(queue)

    async def broadcast(self, event_type: str, data: Dict[str, Any]):
        if not self._listeners:
            return
        payload = json.dumps({"event": event_type, "data": data})
        for queue in list(self._listeners):
            try:
                await queue.put(payload)
            except Exception:
                self.unsubscribe(queue)

broadcaster = EventBroadcaster()
