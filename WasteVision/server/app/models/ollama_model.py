import os
import base64
import requests
from app.models.base import BaseMultimodalModel

class OllamaModel(BaseMultimodalModel):
    def __init__(self, model_name: str):
        self.model_name = model_name
        self.api_url = "http://ollama:11434/api/generate"

    def generate_from_image(self, image_path: str, prompt: str) -> str:
        #print("----------prompt", prompt, flush=True)
        try:
            with open(image_path, "rb") as f:
                base64_image = base64.b64encode(f.read()).decode("utf-8")

            payload = {
                "model": self.model_name,  # e.g. "llava:v1.6"
                "prompt": prompt,
                "images": [base64_image],
                "stream": False
            }

            response = requests.post(self.api_url, json=payload)
            response.raise_for_status()

            return response.json()["response"].strip()

        except Exception as e:
            print(f"❌ Error generating from image with Ollama: {e}", flush=True)
            return f"[Error] {str(e)}"
