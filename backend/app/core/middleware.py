from fastapi.middleware.cors import CORSMiddleware
from fastapi import Request

def add_middleware(app):
    origins = [
        "http://localhost:5173",
         "https://tangent-sand.vercel.app",
         "https://tangent-hj2brma7o-jamesnyims-projects.vercel.app",
         "https://tangentai.xyz",
         "https://www.tangentai.xyz",
    ]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins, #.env variable?
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
