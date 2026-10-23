import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.routes import health, review

logger = logging.getLogger("brandpilot")
settings = get_settings()

app = FastAPI(
    title="BrandPilot AI API",
    version="0.1.0",
    description="Reviews draft content against brand guidelines, approved terms and facts. "
    "Suggestions are advisory; a human makes the final decision.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)
from fastapi.responses import RedirectResponse  # add to the existing responses import

@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/docs")

app.include_router(health.router, prefix="/api")
app.include_router(review.router, prefix="/api")


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    details = [
        {"field": ".".join(str(p) for p in e.get("loc", []) if p != "body"),
         "message": str(e.get("msg", "invalid value")).replace("Value error, ", "")}
        for e in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content={"error": "invalid_request",
                 "message": details[0]["message"] if details else "Invalid request.",
                 "details": details},
    )


@app.exception_handler(Exception)
async def unhandled_handler(request: Request, exc: Exception):
    # Never leak internals or draft content; log type only.
    logger.error("Unhandled error: %s", type(exc).__name__)
    return JSONResponse(
        status_code=500,
        content={"error": "internal_error", "message": "Something went wrong. Please try again."},
    )
