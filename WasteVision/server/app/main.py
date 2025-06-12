
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.middleware import ConcurrencyLimiterMiddleware
from app.api import predict, config

from app.core.app_state import inizialize_app_state
app = FastAPI()

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://react-frontend:5000", "http://localhost"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(ConcurrencyLimiterMiddleware, max_concurrent=50)

# Routers
app.include_router(predict.router, prefix="/api/predict", tags=["predict"])
app.include_router(config.router, prefix="/api/config", tags=["config"])

# Startup
@app.on_event("startup")
async def startup_event():
    await inizialize_app_state()
    