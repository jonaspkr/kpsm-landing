FROM node:22-alpine
WORKDIR /app
COPY build.js server.js ./
COPY content/ content/
COPY src/ src/
COPY images/ images/
COPY admin/ admin/
RUN mkdir -p images && node build.js
COPY images/ dist/images/
COPY admin/ dist/admin/
EXPOSE 8080
CMD ["node", "server.js"]
