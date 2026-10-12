FROM node:20-bullseye-slim

# Install system dependencies: Python3, venv, pip, ffmpeg, curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create and activate virtual environment to prevent PEP 668 errors
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install python dependencies
RUN pip3 install --no-cache-dir --break-system-packages edge-tts deep-translator yt-dlp

WORKDIR /app

# Copy package files and install npm packages
COPY package*.json ./
RUN npm install --omit=dev

# Copy application code
COPY . .

# Ensure data directory exists
RUN mkdir -p data/files

ENV PORT=10000
EXPOSE 10000

CMD ["node", "server.js"]
