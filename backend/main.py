from fastapi import FastAPI
from backend.routers import users  

app = FastAPI(title="Research Portal API")
app.include_router(users.router, prefix="/users")

HOST = "127.0.0.1"
PORT = 8000

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT)