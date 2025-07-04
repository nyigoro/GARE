# Base image: Node.js for Electron + Puppeteer
FROM node:22-slim AS base

# Avoid Puppeteer auto-downloading Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Install system dependencies: Chrome, Rust, etc.
RUN apt-get update && \
    apt-get install -y \
      curl wget gnupg ca-certificates build-essential \
      libgtk-3-0 libxss1 libasound2 libnss3 libx11-xcb1 libxcomposite1 \
      libxdamage1 libxrandr2 libgbm1 libxshmfence1 xdg-utils unzip \
      fonts-liberation && \
    curl https://sh.rustup.rs -sSf | bash -s -- -y && \
    export PATH="$PATH:/root/.cargo/bin" && \
    wget -q -O - https://dl.google.com/linux/linux_signing_key.pub \
      | gpg --dearmor -o /usr/share/keyrings/google.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/google.gpg] http://dl.google.com/linux/chrome/deb/ stable main" \
      > /etc/apt/sources.list.d/google-chrome.list && \
    apt-get update && \
    apt-get install -y google-chrome-stable --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
ENV PATH="/root/.cargo/bin:$PATH"

# === Electron App Build ===
WORKDIR /app
COPY electron-app/package.json electron-app/vite.config.js ./electron-app/
COPY electron-app/src ./electron-app/src
COPY electron-app/preload.js electron-app/main.js ./electron-app/

WORKDIR /app/electron-app/electron-app/package.json electron-app
RUN npm install && npm run build

# === Build Rust Runner ===
COPY rust-engine /app/rust-engine
WORKDIR /app/rust-engine
RUN cargo build

# === Copy User-Facing Components ===
WORKDIR /app
COPY engines /app/engines
COPY scripts /app/scripts
COPY plugins /app/plugins

# === Start Electron App ===
CMD ["npx", "electron", "."]
