#source .venv/bin/activate
#uvicorn main:app --reload
from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI
from app.routes.urls import router as url_router

app = FastAPI()

app.include_router(url_router)

app.mount(
    "/app",
    StaticFiles(directory="frontend", html=True),
    name="frontend",
)