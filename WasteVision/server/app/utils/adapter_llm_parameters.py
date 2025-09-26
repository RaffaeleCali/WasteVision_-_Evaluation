
from app.type.models import CommonLLMParams, Host
from typing import Dict, Any

def normalize_params(host: Host, params: CommonLLMParams) -> Dict[str, Any]:
    if params is None:
        d = {}
    elif hasattr(params, "model_dump"):          # Pydantic v2
        d = params.model_dump(exclude_none=True)
    elif isinstance(params, dict):
        d = {k: v for k, v in params.items() if v is not None}
    else:
        # fallback prudente
        try:
            d = {k: v for k, v in vars(params).items() if v is not None}
        except Exception:
            d = {}
    if host == "openai":
        d.pop("top_k", None)
        d.pop("seed", None) 
        d.pop("temperature", None)
        d.pop("top_p", None)
        d.pop("presence_penalty", None)
        d.pop("frequency_penalty", None)
        mapping = {
            "max_tokens": "max_completion_tokens",
        }
        out = {}
        for k, v in d.items():
            out[mapping.get(k, k)] = v
        return out
        return d

    if host == "google":
        mapping = {
            "top_p": "topP",
            "top_k": "topK",
            "max_tokens": "maxOutputTokens",
            "stop": "stopSequences",
            "presence_penalty": "presencePenalty",
            "frequency_penalty": "frequencyPenalty",
        }
        out = {}
        for k, v in d.items():
            out[mapping.get(k, k)] = v
        out.pop("seed", None)  # Gemini di solito non lo supporta
        return out

    if host == "ollama":
        mapping = {"max_tokens": "num_predict"}
        out = {}
        for k, v in d.items():
            out[mapping.get(k, k)] = v
        out.pop("presence_penalty", None)
        out.pop("frequency_penalty", None)
        return out

    return d
