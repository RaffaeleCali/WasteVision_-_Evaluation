import os
import json
from app.type.models import ModelConfig
from app.config import CONFIG_PATH

class AppState:
    config: ModelConfig | None = None

app_state = AppState()

async def inizialize_app_state():
    if os.path.exists(CONFIG_PATH):
        if os.path.getsize(CONFIG_PATH) == 0:
            print("⚠️ Il file di configurazione esiste ma è vuoto. Ignorato.")
            return
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            try:
                cfg_dict = json.load(f)
                app_state.config = ModelConfig(**cfg_dict)
            except json.JSONDecodeError:
                print("⚠️ Errore nel parsing del file di configurazione. Ignorato.")
    else:
        print("⚠️ Nessuna configurazione trovata.")


def save_app_config(config: ModelConfig):
    if not config.prompt:
        config.prompt = (
            "Calculate of a waste of the plate (is a number 0 to 100, 100 all food in the plate  0 no food in the plate ). "
            "The formula is: waste = FoodArea / (plateArea - GarbageArea). "
            "FoodArea: The area on the plate occupied by the food items; "
            "plateArea: The total surface area of the white plate; "
            "GarbageArea: The area on the plate occupied by garbage. Garbage is not food. "
            "Respond only the result of the model."
        )

    os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        print(f"Salvataggio della configurazione in {config}", flush=True)
        json.dump(config.model_dump(), f, indent=2)
    app_state.config = config

def get_current_config() -> ModelConfig | None:
    return app_state.config
