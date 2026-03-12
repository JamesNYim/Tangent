from fastapi.middleware.cors import CORSMiddleware
from fastapi import Request

def add_middleware(app):
    origins = [
        "http://localhost:5173"
    ]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins, #.env variable?
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
