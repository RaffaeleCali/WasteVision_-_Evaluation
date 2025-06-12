from app.type.models import ModelConfig
from app.models.base import BaseMultimodalModel


def get_model_from_config(config: ModelConfig) -> BaseMultimodalModel:
    if config.host == "google":
        from app.models.google_model import GoogleGeminiModel
        return GoogleGeminiModel(config.model, config.api_key)
    elif config.host == "openai":
        from app.models.openai_model import OpenAIModel
        return OpenAIModel(config.model, config.api_key)
    elif config.host == "ollama":
        from app.models.ollama_model import OllamaModel
        return OllamaModel(config.model)
    else:
        raise ValueError("Unsupported host")
