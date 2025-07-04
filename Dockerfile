# ==========================
# 🏗 Base Image with Chrome & Rust
# ==========================
FROM node:22-slim AS base

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
ENV PATH="/root/.cargo/bin:$PATH"

# Install system dependencies: Puppeteer headless deps, Chrome, Rust
RUN apt-get update && \
    apt-get install -y \
      curl wget gnupg ca-certificates build-essential \
      libgtk-3-0 libxss1 libasound2 libnss3 libx11-xcb1 libxcomposite1 \
      libxdamage1 libxrandr2 libgbm1 libxshmfence1 xdg-utils unzip \
      fonts-liberation && \
    curl https://sh.rustup.rs -sSf | bash -s -- -y && \
    wget -q -O - https://dl.google.com/linux/linux_signing_key.pub \
      | gpg --dearmor -o /usr/share/keyrings/google.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/google.gpg] http://dl.google.com/linux/chrome/deb/ stable main" \
      > /etc/apt/sources.list.d/google-chrome.list && \
    apt-get update && \
    apt-get install -y google-chrome-stable --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*


# ==========================
# 📦 Electron App Build
# ==========================
WORKDIR /app/electron-app

# Copy only package files first (for caching)
COPY electron-app/package*.json ./
COPY electron-app/vite.config.js ./

# Install deps and build app
RUN npm install
COPY electron-app/ ./
RUN npm run build


# ==========================
# ⚙ Rust Runner Build
# ==========================
WORKDIR /app/rust-engine
COPY rust-engine/ ./
RUN cargo build --release


# ==========================
# 📁 Copy Shared Resources
# ==========================
WORKDIR /app
COPY engines/ ./engines
COPY scripts/ ./scripts
COPY plugins/ ./plugins


# ==========================
# 🚀 Start Electron GUI
# ==========================
WORKDIR /app/electron-app
CMD ["npx", "electron", "."]
