
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import status
from fastapi.responses import JSONResponse

from app.core.middleware import ConcurrencyLimiterMiddleware
from app.api import predict, config

from app.core.app_state import inizialize_app_state
app = FastAPI()

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://react-frontend:5000", "http://localhost","http://13.61.178.175:30080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(ConcurrencyLimiterMiddleware, max_concurrent=50)

# Routers
app.include_router(predict.router, prefix="/api/predict", tags=["predict"])
app.include_router(config.router, prefix="/api/config", tags=["config"])

# --- Health-check ----------------------------------------------------------
@app.get("/healthcheck", status_code=status.HTTP_200_OK, tags=["health"])
async def healthcheck():
    """
    Semplice endpoint usato da Kubernetes per readiness/liveness probe.
    Ritorna 200 se l’applicazione è viva e lo stato globale è inizializzato.
    """

    return JSONResponse(content={"status": "ok"})
# ---------------------------------------------------------------------------


# Startup
@app.on_event("startup")
async def startup_event():
    await inizialize_app_state()
    