from fastapi import APIRouter
from app.core.app_state import get_current_config, save_app_config
from app.type.models import ModelConfig

router = APIRouter()

@router.get("")
async def load_config():
    config = get_current_config()
    return config.model_dump() if config else None

@router.post("")
async def update_config(config: ModelConfig):
    save_app_config(config)
    return {"message": "Configurazione salvata"}
