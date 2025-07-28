# app/models/factory.py
from app.type.models import ModelConfig
from app.models.base import BaseMultimodalModel

def get_model_from_config(cfg: ModelConfig) -> BaseMultimodalModel:
    """Restituisce l’istanza del modello corretto, supportando Google, OpenAI e Ollama."""

    match cfg.host:
        case "google":
            if cfg.dlvk:
                from app.models.googleDLVK import GoogleGeminiYoloModel
                return GoogleGeminiYoloModel(cfg.model, cfg.api_key)
            from app.models.google_model import GoogleGeminiModel
            return GoogleGeminiModel(cfg.model, cfg.api_key)

        case "openai":
            if cfg.dlvk:
                from app.models.OpenAIDLVK import OpenAIYoloModel
                return OpenAIYoloModel(cfg.model, cfg.api_key)
            from app.models.openai_model import OpenAIModel
            return OpenAIModel(cfg.model, cfg.api_key)

        case "ollama":
            if cfg.dlvk:
                from app.models.OllamaDLVK import OllamaYoloModel
                return OllamaYoloModel(cfg.model)
            from app.models.ollama_model import OllamaModel
            return OllamaModel(cfg.model)

        case _:
            raise ValueError(f"Unsupported host: {cfg.host}")
