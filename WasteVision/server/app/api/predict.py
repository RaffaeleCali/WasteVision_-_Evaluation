
from fastapi import APIRouter, UploadFile, File, HTTPException,Form
from fastapi.responses import JSONResponse

import tempfile
import shutil

from app.utils.adapter_llm_parameters import normalize_params
from app.type.models import PredictConfig
from app.models.interface import get_model_from_config
from app.prompts.food_waste_prompt import P4_F_DLVK_V2 as _SYS_PROMPT


router = APIRouter()

@router.post("")
async def predict_image(image: UploadFile = File(...), config_json: str = Form(...)):
    try:
        cfg = PredictConfig.model_validate_json(config_json)
    except Exception as e:
        raise HTTPException(400, f"config_json non valido: {e}")

    temp_dir = tempfile.mkdtemp()
    temp_path = f"{temp_dir}/{image.filename}"
    with open(temp_path, "wb") as f:
        shutil.copyfileobj(image.file, f)

    try:
        model = get_model_from_config(cfg)
        prompt = cfg.prompt or _SYS_PROMPT
        keys_selected =  normalize_params(cfg.host, cfg.params)
        print("selected keys for LLM parameters:", keys_selected, flush=True)
        provider_params = normalize_params(cfg.host, cfg.params)
        result = model.generate_from_image(temp_path, prompt, **provider_params)
        if isinstance(result, str):
            result = {"text": result}

        return JSONResponse(content={"result": result})


    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
