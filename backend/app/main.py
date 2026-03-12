from fastapi import FastAPI
from app.api.health import router as health_router
from app.api.auth import router as auth_router
from app.api.posts import router as post_router
from app.db.init_db import init_db
from app.core.middleware import add_middleware

app=FastAPI(title="Backend API")
add_middleware(app)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(post_router)

@app.on_event("startup")
def startup_event():
    init_db()

@app.get("/")
def root():
    return {"status":"ok"}


