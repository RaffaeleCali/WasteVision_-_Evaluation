from abc import ABC, abstractmethod
from typing import Protocol


class BaseMultimodalModel(ABC):
    """Interfaccia per modelli che combinano immagine + testo."""

    @abstractmethod
    def generate_from_image(self, image_path: str, prompt: str) -> str:
        """
        Restituisce la risposta testuale del modello
        dati un percorso dell'immagine e un prompt testuale.
        """
        ...
