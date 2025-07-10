from app.type.models import ModelConfig
from app.models.base import BaseMultimodalModel

def get_model_from_config(cfg: ModelConfig) -> BaseMultimodalModel:
    """Restituisce l’istanza del modello giusta, tenendo conto del flag dlvk."""

    if cfg.host == "google":
        if cfg.dlvk:                                  # variante YOLO
            from app.models.googleDLVK import GoogleGeminiYoloModel
            return GoogleGeminiYoloModel(cfg.model, cfg.api_key)
        from app.models.google_model import GoogleGeminiModel
        return GoogleGeminiModel(cfg.model, cfg.api_key)

    if cfg.host == "openai":
        # se in futuro serve la variante YOLO su OpenAI, gestiscila qui
        from app.models.openai_model import OpenAIModel
        return OpenAIModel(cfg.model, cfg.api_key)

    if cfg.host == "ollama":
        from app.models.ollama_model import OllamaModel
        return OllamaModel(cfg.model)                 # api_key non richiesta

    raise ValueError(f"Unsupported host: {cfg.host}")
