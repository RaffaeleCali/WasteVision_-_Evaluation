# Utilizziamo un'immagine base con Python
FROM python:3.9-slim

# Impostiamo la directory di lavoro
WORKDIR /yolo


RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copiamo i file di dipendenze
COPY requirements.txt /yolo/requirements.txt

# Installiamo le dipendenze
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install python-multipart
RUN pip install dill

# Copiamo il resto dell'applicazione
COPY model /model
COPY model.py model.py

# Esporremo la porta 8080 per il server
EXPOSE 8091

# Comando per avviare il server
CMD ["python", "model.py"]
