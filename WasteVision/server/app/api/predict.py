
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from app.core.app_state import get_current_config
from app.models.interface import get_model_from_config
import tempfile
import shutil
from app.prompts.food_waste_prompt import P4_F_DLVK_V2 as _SYS_PROMPT





router = APIRouter()

@router.post("")
async def predict_image(image: UploadFile = File(...)):
    config = get_current_config()
    if config is None:
        raise HTTPException(status_code=400, detail="Configurazione non presente. Devi configurare l'app prima.")

    temp_dir = tempfile.mkdtemp()
    temp_path = f"{temp_dir}/{image.filename}"
    with open(temp_path, "wb") as f:
        shutil.copyfileobj(image.file, f)

    model = get_model_from_config(config)
    prompt = config.prompt or _SYS_PROMPT
    #print(f" Prompt: {prompt}", flush=True)
    result = model.generate_from_image(temp_path, prompt=prompt)
    print(f"Result: {result}", flush=True)
    shutil.rmtree(temp_dir)

    return JSONResponse(content=result)
