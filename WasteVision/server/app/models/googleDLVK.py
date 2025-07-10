# app/models/google_gemini_yolo.py
import textwrap
from typing import List, Dict, Any
from pathlib import Path
import requests

from app.models.base import BaseMultimodalModel
from google import genai


# ──────────────────── helper YOLO ────────────────────
class YoloError(RuntimeError):
    """Eccezione dedicata ai problemi di comunicazione con il micro-servizio YOLO."""


def _call_yolo(img_path: str, url: str) -> Dict[str, Any]:
    """
    Invia l'immagine al servizio YOLO (POST /) e restituisce:
        {
          "detected_classes": [ {"class_name": str, "confidence": float}, ... ],
          "image": "<base64 annotated>"       # utile se vuoi loggarla
        }
    """
    path = Path(img_path)
    if not path.exists():
        raise FileNotFoundError(path)

    with path.open("rb") as f:
        files = {"file": (path.name, f, "image/jpeg")}
        try:
            r = requests.post(url, files=files, timeout=20)
            r.raise_for_status()
            return r.json()
        except requests.RequestException as e:
            raise YoloError(f"YOLO service error: {e}") from e


def _format_detected(detected: List[Dict[str, Any]]) -> str:
    """Trasforma la lista di detection in testo bullet-list per il prompt."""
    if not detected:
        return "Nessun oggetto rilevato."
    return "\n".join(
        f"- {d['class_name']} (conf. ≈ {d['confidence'] * 100:.0f}%)"
        for d in detected
    )

# --- in google_gemini_yolo.py ---------------------------------------------
import base64, tempfile, os

def _b64_to_temp_file(b64_str: str, suffix: str = ".jpg") -> str:
    """Salva un base64 data-URL su disco temp e restituisce il path."""
    data = b64_str.split(",", 1)[-1]     # rimuove 'data:image/..;base64,'
    fd, path = tempfile.mkstemp(suffix=suffix)
    with os.fdopen(fd, "wb") as f:
        f.write(base64.b64decode(data))
    return path

# ──────────────────── modello multimodale ────────────────────
class GoogleGeminiYoloModel(BaseMultimodalModel):
    """
    Stesso interface del vecchio GoogleGeminiModel **ma** arricchito con YOLO.
    """

    

    def __init__(
        self,
        model_name: str,
        api_key: str,
        yolo_url: str = "http://yolodetect:8091/",
    ):
        self.client = genai.Client(api_key=api_key)
        self.model_name = model_name
        self.yolo_url = yolo_url
        # tieni traccia dell’ultima detection se serve a valle
        self.last_detected_classes: List[Dict[str, Any]] | None = None

    # ───────────────── generate_from_image ──────────────────
    def generate_from_image(self, image_path: str, prompt: str) -> str:
        # 1) YOLO
        yolo_res  = _call_yolo(image_path, self.yolo_url)
        detected  = yolo_res.get("detected_classes", [])
        ann_b64   = yolo_res.get("image")           # base64 annotata

        # 2) prompt
        _SYS_PROMPT = """
            You are assisting with research on automated food-waste detection on canteen
            plates.

            Using the visual information provided and the list of objects detected by the
            YOLOv11l-seg model, calculate the percentage of food waste remaining on the
            plate **after the meal**.

            Definitions
            • FoodArea     – pixel area covered by leftover food items (tagged as FOOD)  
            • GarbageArea  – pixel area covered by inedible or discarded objects
                            (forks, knives, spoons, cups, chips packages, bread board,
                            napkins, bones, etc.)  
            • PlateArea    – pixel area of the entire visible white plate

            Formula
                Waste (%) = 100 × FoodArea / (PlateArea − GarbageArea)

            Output rules  
            1. Return **only** the numerical waste value (integer or one decimal).  
            2. If the data are insufficient or ambiguous, return the exact string
            “NOT SURE”.  
            3. Do **not** output anything else.

            In the multimodal context, image A is the original photo and image B is the
            same photo annotated with YOLO bounding boxes.
            """.strip()

        yolo_txt  = _format_detected(detected)
        full_prompt = (
            f"{_SYS_PROMPT}\n\n"
            "Image A is the original photo; image B is the YOLO-annotated photo.\n"
            "Detected objects:\n"
            f"{yolo_txt}\n\n"
            f"User question: {prompt}"
        )



        # 3) upload immagini
        img_orig = self.client.files.upload(file=image_path)
        contents = [img_orig]

        if ann_b64:
            ann_path = _b64_to_temp_file(ann_b64)
            img_ann  = self.client.files.upload(file=ann_path)
            contents.append(img_ann)

        contents.append(full_prompt)      # testo alla fine
        print("----------full_prompt", textwrap.fill(full_prompt, 80), flush=True)
        # 4) chiamata Gemini
        response = self.client.models.generate_content(
            model=self.model_name,
            contents=contents,
        )
        return response.text
