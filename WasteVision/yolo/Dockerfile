FROM python:3.9-slim
WORKDIR /yolo

# (Opzionale ma utile) libgl1 in caso qualche wheel cerchi GL
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /yolo/requirements.txt

# 1) aggiorna pip
# 2) rimuovi eventuali cv2 non headless (se presenti in cache/dep transitiva)
# 3) installa le dipendenze + forza la versione headless di opencv
RUN python -m pip install --upgrade pip \
 && pip uninstall -y opencv-python opencv-contrib-python || true \
 && pip install --no-cache-dir -r requirements.txt \
 && pip install --no-cache-dir opencv-python-headless==4.10.0.84 \
 && pip install --no-cache-dir python-multipart dill

COPY model /model
COPY model.py model.py

EXPOSE 8091
CMD ["python", "model.py"]
