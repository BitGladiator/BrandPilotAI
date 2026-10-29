import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse

from app.analytics import routes as analytics_routes
from app.auth import routes as auth_routes
from app.config import get_settings
from app.db.session import init_db
from app.documents import routes as documents_routes
from app.drafts import routes as drafts_routes
from app.evaluation import routes as evaluation_routes
from app.routes import health, review

logger = logging.getLogger("brandpilot")
settings = get_settings()

app = FastAPI(
    title="BrandPilot AI API",
    version="0.2.0",
    description="Editorial brand governance, document retrieval with exact citations, reviewer approval workflows, and accuracy analytics.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    try:
        init_db()
    except Exception as exc:
        logger.warning("Could not auto-initialize tables on startup: %s", exc)


@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/docs")


app.include_router(health.router, prefix="/api")
app.include_router(review.router, prefix="/api")
app.include_router(auth_routes.router, prefix="/api")
app.include_router(documents_routes.router, prefix="/api")
app.include_router(drafts_routes.router, prefix="/api")
app.include_router(evaluation_routes.router, prefix="/api")
app.include_router(analytics_routes.router, prefix="/api")


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    details = [
        {
            "field": ".".join(str(p) for p in e.get("loc", []) if p != "body"),
            "message": str(e.get("msg", "invalid value")).replace("Value error, ", ""),
        }
        for e in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content={
            "error": "invalid_request",
            "message": details[0]["message"] if details else "Invalid request.",
            "details": details,
        },
    )


@app.exception_handler(Exception)
async def unhandled_handler(request: Request, exc: Exception):
    logger.error("Unhandled error: %s", type(exc).__name__, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "internal_error", "message": "Something went wrong. Please try again."},
    )
