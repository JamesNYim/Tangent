from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .db import Base, engine
from .routes.conversations import router as conversations_router
from .routes.messages import router as messages_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Tangent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(conversations_router)
app.include_router(messages_router)


@app.get("/health")
def health_check():
    return {"ok": True}
