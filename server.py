"""
AutoML

Launches the API server and allows access
using an Angular SPA.
"""

import os
import pathlib
import re

from firebase_admin import credentials, initialize_app
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

import api.licensing as licensing

load_dotenv()

APP = FastAPI(
    openapi_url="/api/openapi.json", docs_url="/api/docs", redoc_url="/api/redoc"
)

APP.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for file in pathlib.Path("static").glob("main*.js"):
    content = file.read_text()
    tokens = re.findall(r"\$\{\{(\w+)\}\}", content)
    for variable in tokens:
        value = os.getenv(variable)
        if value:
            content = content.replace("${{" + variable + "}}", value)
    file.write_text(content)


@APP.middleware("http")
async def validate_auth_and_license(request: Request, call_next):
    """
    Middleware to handle before and after request issues
    """

    # Ensures the license is active before fulfilling the API request
    if request.method != "OPTIONS" and (
        request.path.startswith("/datasets")
        or request.path.startswith("/jobs")
        or request.path.startswith("/tasks")
        or request.path.startswith("/published")
        or request.path.startswith("/preprocessor_api/encoder")
    ):
        if not licensing.is_license_valid():
            raise licensing.PaymentRequired

    response = await call_next(request)

    # Appends the license capability of the API
    if request.method != "OPTIONS" and (
        request.path.startswith("/datasets")
        or request.path.startswith("/jobs")
        or request.path.startswith("/tasks")
        or request.path.startswith("/published")
        or request.path.startswith("/preprocessor_api")
    ):
        response.headers["access-control-expose-headers"] = "MILO-Trial, MILO-Education"
        active_license = licensing.get_license()
        response.headers["MILO-Trial"] = str(
            active_license.f2 if active_license else True
        ).lower()
        response.headers["MILO-Education"] = str(
            active_license.f3 if active_license else False
        ).lower()

    return response


APP.mount("", StaticFiles(directory="static", html=True), name="static")

if os.path.exists("data/serviceAccountKey.json"):
    initialize_app(credentials.Certificate("data/serviceAccountKey.json"))


@APP.exception_handler(404)
async def custom_404_handler(request: Request, _):
    """Handles 404 errors"""

    if not request.url.path.startswith("/api"):
        return FileResponse("static/index.html")

    return JSONResponse({"detail": "Not Found"}, status_code=404)
