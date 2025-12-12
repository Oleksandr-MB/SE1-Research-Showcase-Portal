from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from src.backend.services import user_service, post_service, review_service
from src.backend.services.paths import ATTACHMENTS_DIR

app = FastAPI(title="Research Showcase Portal API")

HOST = "127.0.0.1"
BACK_PORT = 8000
FRONT_PORT = 3000

app.add_middleware(
    CORSMiddleware,
    allow_origins=[f"http://{HOST}:{FRONT_PORT}", f"http://localhost:{FRONT_PORT}"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(user_service.router, prefix="/users")
app.include_router(post_service.router, prefix="/posts")
app.include_router(review_service.router)
app.mount("/attachments", StaticFiles(directory=ATTACHMENTS_DIR), name="attachments")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=BACK_PORT)
