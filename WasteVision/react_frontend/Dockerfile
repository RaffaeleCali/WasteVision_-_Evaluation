FROM node:20 AS build
WORKDIR /app

# Copia solo i file necessari per l'installazione delle dipendenze
COPY package.json package-lock.json ./

# Usa una cache diversa per ogni architettura per evitare conflitti
# Sostituisci la riga di npm install con questa:
RUN --mount=type=cache,target=/root/.npm,id=npm-${TARGETPLATFORM} npm ci
# Ora copia il resto del codice sorgente
COPY . ./

# Esegui la build
RUN npm run build

# --- FASE 2: Creazione dell'immagine finale con Nginx ---
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Rimuovi i file di default di Nginx
RUN rm -rf ./*

# Copia solo gli artefatti della build dalla fase precedente
COPY --from=build /app/dist .
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 5000
CMD ["nginx", "-g", "daemon off;"]