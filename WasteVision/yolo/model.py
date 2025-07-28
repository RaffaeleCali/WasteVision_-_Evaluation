from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from ultralytics import YOLO
import os
import shutil
import threading
import time
import base64
import cv2
import traceback

app = FastAPI()

model = YOLO(os.getcwd() + "/model/yolo11l-seg.pt")

TEMP_DIR = "temp_images"
os.makedirs(TEMP_DIR, exist_ok=True)

def delayed_cleanup(input_image_path, save_dir, delay=20):
    time.sleep(delay)
    try:
        if os.path.exists(input_image_path):
            os.remove(input_image_path)
            print(f"File rimosso: {input_image_path}")

        if os.path.exists(save_dir):
            for f in os.listdir(save_dir):
                os.remove(os.path.join(save_dir, f))
            print(f"Puliti i file da: {save_dir}")
    except Exception as e:
        print(f"Errore durante il cleanup: {e}")

@app.post("/")
async def upload_and_predict(file: UploadFile = File(...)):
    try:
        input_image_path = os.path.join(TEMP_DIR, file.filename)
        with open(input_image_path, "wb") as f:
            f.write(await file.read())

        results = model.predict(source=[input_image_path], save=False, imgsz=1024)
        result = results[0]

        detected_classes = []
        for i, box in enumerate(result.boxes):
            class_index = int(box.cls)
            class_name = result.names[class_index]
            confidence = round(box.conf.item(), 2)

            area = None
            if result.masks and result.masks.data is not None:
                mask_tensor = result.masks.data[i]
                area = float(mask_tensor.sum().item())

            detected_classes.append({
                "class_name": class_name,
                "confidence": confidence,
                "area": area
            })

        annotated_image = result.plot()
        annotated_bgr = cv2.cvtColor(annotated_image, cv2.COLOR_RGB2BGR)

        output_path = os.path.join(TEMP_DIR, f"annotated_{file.filename}")
        cv2.imwrite(output_path, annotated_bgr)

        with open(output_path, "rb") as img_file:
            base64_image = base64.b64encode(img_file.read()).decode("utf-8")

        threading.Thread(target=delayed_cleanup, args=(input_image_path, TEMP_DIR)).start()

        response = {
            "message": "Predizione completata con successo!",
            "detected_classes": detected_classes,
            "image": base64_image
        }
        return JSONResponse(content=response)

    except Exception as e:
        print("❌ Errore:", str(e))
        traceback.print_exc()
        return JSONResponse(content={"error": str(e)}, status_code=500)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8091)
