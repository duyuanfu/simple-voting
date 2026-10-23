from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.core.config import settings
from app.db.session import engine, Base
import app.models  # Ensure all models are registered
from app.api.v1 import auth, media, campaigns, public, analytics

# Create SQLite tables and perform lightweight schema migrations
Base.metadata.create_all(bind=engine)
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE campaigns ADD COLUMN vote_mode TEXT DEFAULT 'batch'"))
        conn.commit()
    except Exception:
        pass
    try:
        conn.execute(text("ALTER TABLE campaigns ADD COLUMN quota_type TEXT DEFAULT 'lifecycle'"))
        conn.commit()
    except Exception:
        pass

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs"
)

# CORS Middleware (support React development server on port 5173 and production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(media.router, prefix=settings.API_V1_STR)
app.include_router(campaigns.router, prefix=settings.API_V1_STR)
app.include_router(public.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)

@app.get("/health")
def health_check():
    return {"status": "ok", "app": settings.PROJECT_NAME}

# Mount Frontend SPA if dist or static directory exists
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi import HTTPException

STATIC_DIR = Path(__file__).resolve().parent / "static"
if not STATIC_DIR.exists():
    STATIC_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"

if STATIC_DIR.exists() and (STATIC_DIR / "index.html").exists():
    if (STATIC_DIR / "assets").exists():
        app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend_spa(full_path: str):
        if full_path.startswith("api/") or full_path == "api":
            raise HTTPException(status_code=404, detail="API endpoint not found")
        target_file = STATIC_DIR / full_path
        if target_file.exists() and target_file.is_file():
            return FileResponse(target_file)
        return FileResponse(STATIC_DIR / "index.html")

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("PORT", 8001))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
