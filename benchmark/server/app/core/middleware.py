import asyncio
from starlette.middleware.base import BaseHTTPMiddleware

class ConcurrencyLimiterMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_concurrent=100):
        super().__init__(app)
        self.semaphore = asyncio.Semaphore(max_concurrent)
        
    async def dispatch(self, request, call_next):
        async with self.semaphore:
            return await call_next(request)

