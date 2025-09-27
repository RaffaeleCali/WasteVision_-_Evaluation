# app/api/models.py
import re
import os, asyncio, time
from typing import Dict, List, Optional, Any
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
    client = OpenAI(api_key=OPENAI_API_KEY)
    resp = client.models.list()

    # pattern molto generici
    visual_patterns = [
        r"^gpt-",     # tutti i modelli GPT
        r"(chatgpt-)",    # modelli ChatGPT
        r"^o\d",      # tutti i modelli O seguiti da numero (o1, o3, o4...)
        r"realtime",  # modelli realtime
        r"audio",     # modelli con audio
        r"image",     # modelli con immagini
    ]

    regex = re.compile("|".join(visual_patterns), re.IGNORECASE)

    ids = [
        m.id for m in resp.data
        if getattr(m, "id", None) and regex.search(m.id)
    ]

    return sorted(set(ids), key=str.lower)

async def list_google_models() -> List[str]:
    if not GOOGLE_API_KEY:
        raise RuntimeError("GOOGLE_API_KEY non impostata")

    print("Listing Google models...", flush=True)

    client = genai.Client(api_key=GOOGLE_API_KEY)

    keep: List[str] = []
    for m in client.models.list():
        name: str = getattr(m, "name", "") or ""
        acts = [a.lower() for a in getattr(m, "supported_actions", [])]

        nid = name.lower()

        # solo Gemini “LLM” (no generators/embeddings) con generateContent
        is_gemini = nid.startswith("models/gemini")
        has_text_gen = ("generatecontent" in acts) or ("bidigeneratecontent" in acts)

        is_embedding = ("embed" in nid) or ("embedding" in nid)
        is_pure_image_or_video_gen = ("imagen" in nid) or ("veo" in nid)

        if is_gemini and has_text_gen and not (is_embedding or is_pure_image_or_video_gen):
            # normalizza per la UI: togli 'models/' davanti
            display = name[len("models/"):] if name.startswith("models/") else name
            keep.append(display)

    # ordina case-insensitive e rimuovi duplicati
    return sorted(set(keep), key=str.lower)

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434").rstrip("/")

# hint sul NOME (fallback, niente liste rigide)
_NAME_HINTS = re.compile(
    r"(?:\bllava\b|vision\b|[-_.]vl\b|moondream|minicpm|internvl|cogvlm|"
    r"phi[\s\-_.]?(?:3\.5|4).*vision|qwen.*-vl|yi.*-vl)",
    re.IGNORECASE
)

def _looks_vllm_from_tags(entry: Dict[str, Any]) -> bool:
    """Heuristics veloci dai soli /api/tags."""
    name = (entry.get("name") or "").lower()
    details = entry.get("details") or {}
    fams = [str(x).lower() for x in (details.get("families") or []) if x]
    fam  = str(details.get("family") or "").lower()
    fams += [fam] if fam else []
    # indizi tipici: famiglia 'clip' o 'vl' → vision encoder presente (es. LLaVA)
    if any(f in ("clip",) or "vl" in f or "vision" in f for f in fams if f):
        return True
    # fallback sul nome
    return bool(_NAME_HINTS.search(name))

def _looks_vllm_from_show(p: Dict[str, Any]) -> bool:
    """Heuristics dai metadati di /api/show."""
    if not p:
        return False
    details = p.get("details") or {}
    fams = [str(x).lower() for x in (details.get("families") or []) if x]
    fam  = str(details.get("family") or "").lower()
    fams += [fam] if fam else []
    if any(f in ("clip",) or "vl" in f or "vision" in f for f in fams if f):
        return True
    mi = p.get("model_info") or {}
    keys_blob = " ".join(list(mi.keys())).lower()
    vals_blob = " ".join([str(v) for v in mi.values()])[:20000].lower()
    if any(tok in keys_blob or tok in vals_blob for tok in ("mmproj", "image_proj", "clip", "vision", "vl")):
        return True
    modelfile = (p.get("modelfile") or "").lower()
    template  = (p.get("template") or "").lower()
    if any(tok in modelfile for tok in ("mmproj", "clip", "vision")):
        return True
    if any(tok in template for tok in ("<image>", "{image}", "image:")):
        return True
    name = (p.get("name") or p.get("model") or "").lower()
    return bool(_NAME_HINTS.search(name))

async def list_ollama_models() -> List[str]:
    """Restituisce SOLO VLLM con **ID completi** (es. 'llava:v1.6')."""
    async with httpx.AsyncClient(timeout=10) as x:
        r = await x.get(f"{OLLAMA_HOST}/api/tags")
        r.raise_for_status()
        tags = (r.json() or {}).get("models", [])

        # primo passaggio: filtra dai tag (veloce)
        fast = [m for m in tags if _looks_vllm_from_tags(m)]
        # candidati ambigui (non riconosciuti dai tag ma sospetti per nome)
        ambiguous = [
            m for m in tags
            if not _looks_vllm_from_tags(m)
            and _NAME_HINTS.search((m.get("name") or ""))
        ]

        sem = asyncio.Semaphore(6)
        async def fetch_show(name: str):
            async with sem:
                try:
                    resp = await x.post(f"{OLLAMA_HOST}/api/show", json={"name": name})
                    resp.raise_for_status()
                    return name, resp.json() or {}
                except Exception:
                    return name, None

        shows = await asyncio.gather(*[fetch_show(m["name"]) for m in ambiguous if m.get("name")])

    keep = {m["name"] for m in fast if m.get("name")}
    for name, payload in shows:
        if _looks_vllm_from_show(payload):
            keep.add(name)

    # RITORNA **id completi** (niente split ':')
    return sorted(keep, key=str.lower)


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
