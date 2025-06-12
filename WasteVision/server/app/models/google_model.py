import os
from app.models.base import BaseMultimodalModel

from google import genai

class GoogleGeminiModel(BaseMultimodalModel):
    def __init__(self, model_name: str, api_key: str):
        self.client = genai.Client(api_key=api_key)
        self.model_name = model_name

    def generate_from_image(self, image_path: str, prompt: str) -> str:
        print("----------prompt", prompt,flush=True)
        uploaded_file = self.client.files.upload(file=image_path)
        response = self.client.models.generate_content(
            model=self.model_name,
            contents=[uploaded_file, prompt],
        )
        return response.text