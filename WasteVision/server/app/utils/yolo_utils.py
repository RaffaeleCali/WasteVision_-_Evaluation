import base64
import os
import tempfile
from pathlib import Path
from typing import List, Dict, Any

import requests


class YoloError(RuntimeError):
    """Eccezione dedicata ai problemi di comunicazione con il micro-servizio YOLO."""


def call_yolo(img_path: str, url: str) -> Dict[str, Any]:
    """
    Invia l'immagine al servizio YOLO (POST /) e restituisce:
        {
          "detected_classes": [ {"class_name": str, "confidence": float}, ... ],
          "image": "<base64 annotated>"
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


def format_detected(detected: List[Dict[str, Any]]) -> str:
    """Trasforma la lista di detection in testo bullet-list per il prompt."""
    if not detected:
        return "Nessun oggetto rilevato."
    return "\n".join(
        f"- {d['class_name']} (conf. ≈ {d['confidence'] * 100:.0f}%  area :{d['area']})"
        for d in detected
    )


def b64_to_temp_file(b64_str: str, suffix: str = ".jpg") -> str:
    """Salva un'immagine base64 (senza header data:image/...) su file temporaneo e restituisce il path."""
    fd, path = tempfile.mkstemp(suffix=suffix)
    with os.fdopen(fd, "wb") as f:
        f.write(base64.b64decode(b64_str))
    return path
