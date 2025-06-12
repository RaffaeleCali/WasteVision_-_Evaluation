FROM node:20 AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . ./
RUN npm run build

RUN ls -l /app/dist || echo "Build folder not found!"

FROM nginx:alpine
WORKDIR /usr/share/nginx/html

RUN mkdir -p /usr/share/nginx/html

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 5000
CMD ["nginx", "-g", "daemon off;"]
