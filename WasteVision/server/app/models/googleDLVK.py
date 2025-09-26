# app/models/googleDVLK.py
import textwrap
from typing import List, Dict, Any

from google import genai
from app.models.base import BaseMultimodalModel
from app.utils.yolo_utils import call_yolo,format_detected, b64_to_temp_file
from app.prompts.food_waste_prompt import P4_F_DLVK_V2 as _SYS_PROMPT
from google.genai.types import GenerateContentConfig



class GoogleGeminiYoloModel(BaseMultimodalModel):
    def __init__(self, model_name: str, api_key: str, yolo_url: str = "http://yolodetect:8091/"):
        self.client = genai.Client(api_key=api_key)
        self.model_name = model_name
        self.yolo_url = yolo_url
        self.last_detected_classes: List[Dict[str, Any]] | None = None

    def generate_from_image(self, image_path: str, prompt: str,**kwargs) -> str:
        # 1) YOLO
        yolo_res = call_yolo(image_path, self.yolo_url)
        detected = yolo_res.get("detected_classes", [])
        ann_b64 = yolo_res.get("image")

        if prompt is None or prompt.strip() == "":
            prompt_d = _SYS_PROMPT
        else:
            prompt_d = prompt
        yolo_txt = format_detected(detected)
        full_prompt = f"{prompt_d}\n\nDetected objects:\n{yolo_txt}\n\n"

        img_orig = self.client.files.upload(file=image_path)
        contents = [img_orig]

        if ann_b64:
            ann_path = b64_to_temp_file(ann_b64)
            img_ann = self.client.files.upload(file=ann_path)
            contents.append(img_ann)

        contents.append(full_prompt)
        print("----------full_prompt", textwrap.fill(full_prompt, 80), flush=True)
        config = GenerateContentConfig(**kwargs)

        response = self.client.models.generate_content(
            model=self.model_name,
            contents=contents,
            config=config
        )
        return response.text
