
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from app.core.app_state import get_current_config
from app.models.interface import get_model_from_config
import tempfile
import shutil





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
    prompt = config.prompt or "Calculate of a waste of the plate (is a number 0 to 100, 100 all food in the plate  0 no food in the plate ) , the formula is  : waste = FoodArea / (plateArea - GarbageArea) . FoodArea : The area on the plate occupied by the food items; `plateArea`: The total surface area of the white plate;  `GarbageArea`: The area on the plate occupied by garbage.Garbage is not fod. Responde only the result of the model"
    result = model.generate_from_image(temp_path, prompt=prompt)
    print(f"Result: {result}", flush=True)
    shutil.rmtree(temp_dir)

    return JSONResponse(content=result)
