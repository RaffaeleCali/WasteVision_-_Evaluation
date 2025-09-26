from pydantic import BaseModel,confloat, conint
from typing import Optional, List, Literal, Dict, Any

Host = Literal["google", "openai", "ollama"]



#class ModelConfig(BaseModel):
#    host: str
#    model: str
#    api_key: Optional[str] = None
#    prompt: Optional[str] = None
#    dlvk: bool = False

class CommonLLMParams(BaseModel):
    temperature: Optional[confloat(ge=0, le=2)] = None
    top_p: Optional[confloat(ge=0, le=1)] = None
    top_k: Optional[conint(ge=1, le=10000)] = None
    max_tokens: Optional[int] = None
    presence_penalty: Optional[confloat(ge=-2, le=2)] = None
    frequency_penalty: Optional[confloat(ge=-2, le=2)] = None
    stop: Optional[List[str]] = None
    seed: Optional[int] = None

class PredictConfig(BaseModel):
    host: Host
    model: str
    api_key: Optional[str] = None
    prompt: Optional[str] = None
    dlvk: Optional[bool] = False
    params: Optional[CommonLLMParams] = None