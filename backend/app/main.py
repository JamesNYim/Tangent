from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.session import Base, engine
from app.routes.conversations import router as conversations_router
from app.routes.messages import router as messages_router
from app.api.auth import router as auth_router
from app.routes.users import router as users_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Tangent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(conversations_router)
app.include_router(messages_router)
app.include_router(users_router)


@app.get("/health")
def health_check():
    return {"ok": True}
