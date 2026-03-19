import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import engine, Base, SessionLocal
from .routers.articles import router
from .services.ingestion import run_ingestion
from .services.ai_service import process_unprocessed_articles

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup tasks: create tables and trigger initial ingestion."""
    logger.info("Starting AI News Aggregator backend...")

    Base.metadata.create_all(bind=engine)
    logger.info("Database tables verified")

    try:
        db = SessionLocal()
        new_articles = await run_ingestion(db)
        logger.info(f"Initial ingestion: {new_articles} new articles")

        ai_processed = process_unprocessed_articles(db)
        logger.info(f"Initial AI processing: {ai_processed} articles processed")
        db.close()
    except Exception as e:
        logger.error(f"Startup ingestion error: {e}")

    yield

    logger.info("Shutting down AI News Aggregator backend...")


app = FastAPI(
    title="AI News Aggregator",
    description="An AI-powered news aggregation API that collects, summarizes, and analyzes news sentiment.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend to access API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
def root():
    return {
        "app": "AI News Aggregator",
        "version": "1.0.0",
        "docs": "/docs",
    }
