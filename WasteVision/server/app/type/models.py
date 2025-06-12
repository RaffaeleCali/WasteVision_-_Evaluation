from pydantic import BaseModel
from typing import Optional

class ModelConfig(BaseModel):
    host: str
    model: str
    api_key: Optional[str] = None
    prompt: Optional[str] = None  
