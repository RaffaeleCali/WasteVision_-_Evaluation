# app/api/models.py
import os, asyncio, time
from typing import Dict, List, Optional
import httpx
from fastapi import APIRouter
from pydantic import BaseModel, Field

from openai import OpenAI
from google import genai

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
OLLAMA_HOST   = os.getenv("OLLAMA_HOST", "http://localhost:11434")
CACHE_TTL     = int(os.getenv("MODELS_CACHE_TTL", "300"))

_cache: Dict[str, Dict] = {"models_by_host": None, "warnings": None, "ts": 0.0}

class ModelsResponse(BaseModel):
    models_by_host: Dict[str, List[str]] = Field(default_factory=dict)
    warnings: Dict[str, str] = Field(default_factory=dict)

async def list_openai_models() -> List[str]:
    print("Listing OpenAI models...", flush=True)
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY non impostata")
    client = OpenAI(api_key=OPENAI_API_KEY)
    resp = client.models.list()
    ids = [m.id for m in resp.data if getattr(m, "id", None)]
    return sorted(set(ids), key=str.lower)

async def list_google_models() -> List[str]:
    print("Listing Google models...", flush=True)


    client = genai.Client()
    names = []
    print("List of models that support generateContent:\n")
    for m in client.models.list():
        for action in m.supported_actions:
            if action == "generateContent":
                names.append(m.name)
                print(m.name)
    if not GOOGLE_API_KEY:
        raise RuntimeError("GOOGLE_API_KEY non impostata")
    #genai.Client(api_key=GOOGLE_API_KEY)
    #models = genai.models.list()
    #names = [
    #    m.name for m in models
    #    if getattr(m, "supported_generation_methods", None)
    #    and "generateContent" in m.supported_generation_methods
    #    and getattr(m, "name", None)
    #]
    return sorted(set(names), key=str.lower)

async def list_ollama_models() -> List[str]:
    print("Listing Ollama models...", flush=True)
    url = f"{OLLAMA_HOST.rstrip('/')}/api/tags"
    async with httpx.AsyncClient(timeout=5) as client:
        r = await client.get(url)
        r.raise_for_status()
        payload = r.json() or {}
    models = payload.get("models", [])
    names = [m.get("name") for m in models if m.get("name")]
    return sorted(set(names), key=str.lower)

async def fetch_all_models() -> ModelsResponse:
    warnings: Dict[str, str] = {}
    results: Dict[str, List[str]] = {}

    tasks = {
        "openai": asyncio.create_task(list_openai_models()),
        "google": asyncio.create_task(list_google_models()),
        "ollama": asyncio.create_task(list_ollama_models()),
    }
    defaults = {"openai": [], "google": [], "ollama": []}

    for host, task in tasks.items():
        try:
            results[host] = await task
        except Exception as e:
            warnings[host] = f"{type(e).__name__}: {e}"
            results[host] = defaults[host]

    return ModelsResponse(models_by_host=results, warnings=warnings)

router = APIRouter()

@router.get("", response_model=ModelsResponse)  # <-- GET (non POST)
async def get_models(force_refresh: Optional[bool] = False):
    now = time.time()
    if (
        not force_refresh
        and _cache["models_by_host"] is not None
        and (now - _cache["ts"]) < CACHE_TTL
    ):
        return ModelsResponse(
            models_by_host=_cache["models_by_host"],
            warnings=_cache["warnings"] or {},
        )

    data = await fetch_all_models()
    _cache.update(
        {"models_by_host": data.models_by_host, "warnings": data.warnings, "ts": now}
    )
    return data
