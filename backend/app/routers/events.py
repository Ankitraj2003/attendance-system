import asyncio
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.services.event_service import broadcaster

router = APIRouter(prefix="/api/events", tags=["Real-time Events"])

@router.get("/stream")
async def event_stream():
    queue = await broadcaster.subscribe()

    async def event_generator():
        try:
            # Yield initial connection ping
            yield "data: {\"event\": \"CONNECTED\", \"message\": \"SSE stream initialized\"}\n\n"
            while True:
                # Wait for next event or send keepalive ping every 15s
                try:
                    msg = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"data: {msg}\n\n"
                except asyncio.TimeoutError:
                    yield "data: {\"event\": \"PING\"}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            broadcaster.unsubscribe(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
