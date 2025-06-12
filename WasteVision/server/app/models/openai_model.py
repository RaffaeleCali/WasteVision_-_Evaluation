import base64
from openai import OpenAI
from app.models.base import BaseMultimodalModel

class OpenAIModel(BaseMultimodalModel):
    def __init__(self, model_name: str, api_key: str):
        self.client = OpenAI(api_key=api_key)
        self.model_name = model_name

    def generate_from_image(self, image_path: str, prompt: str) -> str:
        with open(image_path, "rb") as f:
            base64_image = base64.b64encode(f.read()).decode("utf-8")

        response = self.client.chat.completions.create(
            model=self.model_name,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=100,
        )

        return response.choices[0].message.content
