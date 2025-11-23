from fastapi import FastAPI
from src.backend.services import user_service, post_service

app = FastAPI(title="Research Showcase Portal API")
app.include_router(user_service.router, prefix="/users")
app.include_router(post_service.router, prefix="/posts")

HOST = "127.0.0.1"
PORT = 8000

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT)
