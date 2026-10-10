FROM node:20-bullseye-slim

# Install system dependencies: Python3, pip, ffmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies: edge-tts, deep-translator, yt-dlp
RUN pip3 install --no-cache-dir edge-tts deep-translator yt-dlp

WORKDIR /app

# Copy package files and install npm packages
COPY package*.json ./
RUN npm install --production

# Copy application code
COPY . .

# Ensure data directory exists
RUN mkdir -p data/files

ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
