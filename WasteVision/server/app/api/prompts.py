# app/api/prompts.py
from fastapi import APIRouter, HTTPException
import importlib
import inspect

router = APIRouter()

def _humanize(name: str) -> str:
    # es: FOOD_WASTE_SYS_PROMPT -> "Food Waste Sys Prompt"
    return name.replace("_", " ").title()

@router.get("")
def list_prompts():
    """
    Legge il modulo app.prompts.prompt e ritorna tutte le variabili stringa.
    Response:
    {
      "prompts": [
        {"key": "FOOD_WASTE_SYS_PROMPT", "label": "Food Waste Sys Prompt", "text": "..."},
        ...
      ]
    }
    """
    try:
        mod = importlib.import_module("app.prompts.food_waste_prompt")
    except ImportError as e:
        raise HTTPException(status_code=500, detail=f"Prompt module not found: {e}")

    prompts = []
    for name, val in inspect.getmembers(mod):
        if name.startswith("_"):
            continue
        if isinstance(val, str):
            prompts.append({
                "key": name,
                "label": _humanize(name),
                "text": val,
            })

    # opzionale: ordina alfabeticamente per label
    prompts.sort(key=lambda p: p["label"])
    return {"prompts": prompts}
