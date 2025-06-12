
class BaseMultimodalModel:
    def generate_from_image(self, image_path: str, prompt: str) -> str:
        raise NotImplementedError
