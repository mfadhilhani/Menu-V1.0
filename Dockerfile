# Tesfood di server sendiri. Belum diuji build-nya; lihat README bagian "Pindah ke hosting sendiri".
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV NODE_ENV=production FFMPEG_PATH=/usr/bin/ffmpeg PORT=3000
EXPOSE 3000
CMD ["npm", "run", "start"]
