FROM node:20 AS build
WORKDIR /app

COPY package.json package-lock.json ./

# AGGIUNGI QUESTA RIGA:
# Controlla l'architettura. Se è arm64 (aarch64), installa il pacchetto nativo di Rollup.
RUN if [ "$(uname -m)" = "aarch64" ]; then npm install --save-dev @rollup/rollup-linux-arm64-gnu; fi

# Usa una cache diversa per ogni architettura per evitare conflitti
RUN --mount=type=cache,target=/root/.npm,id=npm-${TARGETPLATFORM} npm install

COPY . ./
RUN npm run build

# --- FASE 2: Creazione dell'immagine finale con Nginx ---
FROM nginx:alpine
WORKDIR /usr/share/nginx/html
RUN rm -rf ./*
COPY --from=build /app/dist .
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 5000
CMD ["nginx", "-g", "daemon off;"]