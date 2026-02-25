FROM node:22-alpine AS builder
WORKDIR /app
COPY build.js .
COPY content/ content/
COPY src/ src/
RUN mkdir -p images && node build.js

FROM nginx:alpine
COPY --from=builder /app/dist/ /usr/share/nginx/html/
COPY images/ /usr/share/nginx/html/images/
COPY admin/ /usr/share/nginx/html/admin/
