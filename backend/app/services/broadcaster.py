import asyncio
from typing import Dict, List, Any
from collections import defaultdict

class CampaignBroadcaster:
    def __init__(self):
        # campaign_id -> list of asyncio.Queue
        self._subscribers: Dict[int, List[asyncio.Queue]] = defaultdict(list)

    def subscribe(self, campaign_id: int) -> asyncio.Queue:
        q = asyncio.Queue(maxsize=100)
        self._subscribers[campaign_id].append(q)
        return q

    def unsubscribe(self, campaign_id: int, q: asyncio.Queue):
        if campaign_id in self._subscribers:
            if q in self._subscribers[campaign_id]:
                self._subscribers[campaign_id].remove(q)
            if not self._subscribers[campaign_id]:
                del self._subscribers[campaign_id]

    async def broadcast(self, campaign_id: int, message: Dict[str, Any]):
        if campaign_id not in self._subscribers:
            return
        
        for q in list(self._subscribers[campaign_id]):
            try:
                # Non-blocking put
                if q.full():
                    try:
                        q.get_nowait()
                    except asyncio.QueueEmpty:
                        pass
                await q.put(message)
            except Exception:
                pass

broadcaster = CampaignBroadcaster()
