# app/models/openai_yolo.py
import base64
from typing import List, Dict, Any
from openai import OpenAI

from app.models.base import BaseMultimodalModel
from app.utils.yolo_utils import call_yolo, format_detected
from app.prompts.food_waste_prompt import P4_F_DLVK_V2 as _SYS_PROMPT



class OpenAIYoloModel(BaseMultimodalModel):
    def __init__(
        self,
        model_name: str,
        api_key: str,
        yolo_url: str = "http://yolodetect:8091/",
    ):
        self.client = OpenAI(api_key=api_key)
        self.model_name = model_name
        self.yolo_url = yolo_url

    # --------------------------------------------------------------- #

    def generate_from_image(self, image_path: str, prompt: str,**kwargs) -> str:
        # 1) YOLO
        yolo_res = call_yolo(image_path, self.yolo_url)
        detected: List[Dict[str, Any]] = yolo_res.get("detected_classes", [])
        ann_b64: str | None = yolo_res.get("image")

        # 2) Carica la foto originale in base-64 (inline, niente helper extra)
        with open(image_path, "rb") as f:
            orig_b64 = base64.b64encode(f.read()).decode("utf-8")

        
        # 3) Messaggi
        sys_msg = {"role": "system", "content": _SYS_PROMPT}

        user_content = [
            {
                "type": "text",
                "text": (
                    f"Detected objects:\n{format_detected(detected)}\n\n{prompt}"
                ),
            },
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{orig_b64}"},
            },
        ]

        # seconda immagine (annotata) se presente
        if ann_b64:
            user_content.append(
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{ann_b64}"},
                }
            )

        # 4) Chiamata a GPT-4o (vision)
        response = self.client.chat.completions.create(
            model=self.model_name,
            messages=[sys_msg, {"role": "user", "content": user_content}],
            **kwargs
        )
        return {
            "text":  response.choices[0].message.content.strip(),          # risposta LLM
            "segmented_image": ann_b64,     # <-- base64 dell'overlay YOLO
            # "detection_image": ...        
        }
