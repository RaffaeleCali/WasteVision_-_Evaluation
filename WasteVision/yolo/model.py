from fastapi import FastAPI, File, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from ultralytics import YOLO
import os
import io
from PIL import Image
import shutil
import threading
import time
import base64
from io import BytesIO

app = FastAPI()


# Carica il modello YOLO pre-addestrato
model = YOLO(os.getcwd()+"/model/yolo11l-seg.pt")  


TEMP_DIR = "temp_images"
os.makedirs(TEMP_DIR, exist_ok=True)

def delayed_cleanup(input_image_path, save_dir, delay=20):
    """
    Rimuove i file temporanei dopo un ritardo.
    """
    time.sleep(delay)  
    try:
        if os.path.exists(input_image_path):
            os.remove(input_image_path)
            print(f"File rimosso: {input_image_path}")
        if os.path.exists(save_dir):
            shutil.rmtree(save_dir)
            print(f"Directory rimossa: {save_dir}")
    except Exception as e:
        print(f"Errore durante il cleanup: {e}")

@app.post("/")
async def upload_and_predict(file: UploadFile = File(...)):
    try:
        # Salva l'immagine caricata in una directory temporanea
        input_image_path = os.path.join(TEMP_DIR, file.filename)
        with open(input_image_path, "wb") as f:
            f.write(await file.read())

        # Esegui la predizione con YOLO
        results = model.predict(source=[input_image_path], save=True, save_txt=False, imgsz=1024)
        print(f"directory --- {results[0].save_dir}")
        # Trova il percorso dell'immagine con le predizioni
        output_image_path = os.getcwd() + "/" + results[0].save_dir
          # YOLO salva l'immagine con le predizioni automaticamente
        for file_name in os.listdir(output_image_path):
            if file_name.endswith((".jpg", ".jpeg", ".png")):  # Cerca un'immagine
                output_image_path = os.path.join(output_image_path, file_name)
                break
        # Restituisci l'immagine con le rilevazioni
        if not output_image_path:
            raise FileNotFoundError("Immagine con le rilevazioni non trovata.")
        
        
        detected_classes = []
        for result in results:
            for box in result.boxes:
                class_index = int(box.cls)  # Ottieni l'indice della classe
                class_name = result.names[class_index]  # Nome della classe
                confidence = box.conf.item()  # Confidenza
                detected_classes.append({
                    "class_name": class_name,
                    "confidence": round(confidence, 2)
                })


        with open(output_image_path, "rb") as image_file:
            base64_image = f"data:image/jpeg;base64,{base64.b64encode(image_file.read()).decode('utf-8')}"

        # Restituisci l'immagine con le rilevazioni
        

        threading.Thread(target=delayed_cleanup, args=(input_image_path, results[0].save_dir)).start()

        response = {
            "message": "Predizione completata con successo!",
            "detected_classes": detected_classes,
            "image": base64_image
        }
        return JSONResponse(content=response)
        

    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

    

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8091)
