import base64
import requests
from typing import List, Dict, Any
from app.models.base import BaseMultimodalModel
from app.utils.yolo_utils import call_yolo, format_detected
from app.prompts.food_waste_prompt import FOOD_WASTE_SYS_PROMPT_DLVK as sys_prompt


class OllamaYoloModel(BaseMultimodalModel):
    def __init__(
        self,
        model_name: str,
        yolo_url: str = "http://yolodetect:8091/",
        host: str = "http://ollama:11434"
    ):
        self.model_name = model_name        
        self.yolo_url = yolo_url
        self.api_url = f"{host}/api/generate"

    def _encode_image(self, path: str) -> str:
        with open(path, "rb") as f:
            return base64.b64encode(f.read()).decode("utf-8")

    def generate_from_image(self, image_path: str, prompt: str) -> str:
        # 1) YOLO detection
        yolo_res = call_yolo(image_path, self.yolo_url)
        detected = yolo_res.get("detected_classes", [])
        ann_b64 = yolo_res.get("image")

        full_prompt = (
            f"{sys_prompt}\n\n"
            "Detected objects:\n"
            f"{format_detected(detected)}\n\n"
            f"{prompt}"
        )
        
        print("OLLAMADLVK: full_prompt", full_prompt, flush=True)
        # 2) Usa l'immagine annotata se disponibile, altrimenti l'originale
        #image_b64 = ann_b64 or self._encode_image(image_path)
        images: List[str] = [self._encode_image(image_path)]
        if ann_b64:
            images.append(ann_b64)  # seconda immagine (annotata)

        # 3) Payload per /api/generate (senza messages!)
        payload: Dict[str, Any] = {
            "model": self.model_name,
            "prompt": full_prompt,
            "images": images,
            "stream": False,
        }
        
        # 4) POST a Ollama
        try:
            resp = requests.post(self.api_url, json=payload, timeout=520)
            resp.raise_for_status()
            return resp.json()["response"].strip()
        except Exception as e:
            return f"[Ollama error] {e}"
