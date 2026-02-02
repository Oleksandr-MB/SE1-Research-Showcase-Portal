import os
import time
import asyncio
from collections import defaultdict, deque
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from src.backend.services import user_service, post_service, review_service, report_service
from src.backend.services.paths import ATTACHMENTS_DIR

app = FastAPI(title="Research Showcase Portal API")

HOST = "127.0.0.1"
BACK_PORT = 8000
FRONT_PORT = 3000
RATE_LIMIT_MAX_REQUESTS = int(os.getenv("RSP_RATE_LIMIT_MAX", "180"))
RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("RSP_RATE_LIMIT_WINDOW_SECONDS", "60"))

_rate_limit_lock = asyncio.Lock()
_rate_limit_buckets: dict[str, deque[float]] = defaultdict(deque)


def _get_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    now = time.time()
    ip = _get_client_ip(request)
    async with _rate_limit_lock:
        bucket = _rate_limit_buckets[ip]
        window_start = now - RATE_LIMIT_WINDOW_SECONDS
        while bucket and bucket[0] < window_start:
            bucket.popleft()
        if len(bucket) >= RATE_LIMIT_MAX_REQUESTS:
            retry_after = int(bucket[0] + RATE_LIMIT_WINDOW_SECONDS - now) + 1
            headers = {
                "Retry-After": str(max(retry_after, 1)),
                "X-RateLimit-Limit": str(RATE_LIMIT_MAX_REQUESTS),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(int(bucket[0] + RATE_LIMIT_WINDOW_SECONDS)),
            }
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Try again later."},
                headers=headers,
            )

        bucket.append(now)
        remaining = max(RATE_LIMIT_MAX_REQUESTS - len(bucket), 0)
        reset_at = int(bucket[0] + RATE_LIMIT_WINDOW_SECONDS)

    response = await call_next(request)
    response.headers["X-RateLimit-Limit"] = str(RATE_LIMIT_MAX_REQUESTS)
    response.headers["X-RateLimit-Remaining"] = str(remaining)
    response.headers["X-RateLimit-Reset"] = str(reset_at)
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        f"http://{HOST}:{FRONT_PORT}",
        f"http://localhost:{FRONT_PORT}",
        "https://research-showcase-portal-frontend.azurewebsites.net"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(user_service.router, prefix="/users")
app.include_router(post_service.router, prefix="/posts")
app.include_router(review_service.router)
app.include_router(report_service.router, prefix="/reports")
app.mount("/attachments", StaticFiles(directory=ATTACHMENTS_DIR), name="attachments")


@app.on_event("startup")
def _start_background_scheduler() -> None:
    user_service.start_cleanup_scheduler()


@app.on_event("shutdown")
def _stop_background_scheduler() -> None:
    user_service.stop_cleanup_scheduler()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=BACK_PORT)
