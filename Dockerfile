# Frontend Docker image: build the SPA with Vite, serve with nginx.
# Build arg VITE_API_BASE_URL is baked into the bundle at build time.

FROM node:20-slim AS build
WORKDIR /web
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
ARG VITE_API_BASE_URL=""
ARG VITE_API_TOKEN=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_API_TOKEN=$VITE_API_TOKEN
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /web/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
ENV PORT=8080
EXPOSE 8080
# Cloud Run sets $PORT; replace nginx's listen port at start time.
CMD ["sh", "-c", "sed -i \"s/listen 8080/listen ${PORT}/\" /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
