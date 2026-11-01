FROM node:20-bookworm-slim

# Install system dependencies: Python3, pip, venv, ffmpeg, curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set up virtual environment to avoid PEP 668 restrictions
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Install python dependencies inside virtualenv
RUN pip install --no-cache-dir edge-tts deep-translator yt-dlp

WORKDIR /app

# Copy package files and install npm dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy application source
COPY . .

# Ensure data directories exist
RUN mkdir -p data/files data/cache

ENV PORT=10000
EXPOSE 10000

CMD ["node", "server.js"]
