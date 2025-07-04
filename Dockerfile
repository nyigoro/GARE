# =============================
# 🧱 Base Image with Chrome, Rust, Python, Xvfb
# =============================
FROM node:22-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
ENV PATH="/root/.cargo/bin:$PATH"

# Install system dependencies
RUN apt-get update && \
    apt-get install -y \
      curl wget gnupg ca-certificates build-essential \
      libgtk-3-0 libxss1 libasound2 libnss3 libx11-xcb1 libxcomposite1 \
      libxdamage1 libxrandr2 libgbm1 libxshmfence1 xdg-utils unzip \
      fonts-liberation xvfb python3 python3-pip && \
    curl https://sh.rustup.rs -sSf | bash -s -- -y && \
    wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/google.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list && \
    apt-get update && \
    apt-get install -y google-chrome-stable --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Upgrade npm
RUN npm install -g npm@11.4.2

# =============================
# 🧠 Electron Frontend (Vite + React)
# =============================
WORKDIR /app/electron-app
COPY electron-app/package*.json ./
COPY electron-app/vite.config.js ./
COPY electron-app/preload.js ./  # preload script
COPY electron-app/main.js ./     # Electron entry
COPY electron-app/src ./src

RUN npm install
RUN npm run build

# =============================
# 🦀 Rust Backend (gare-runner)
# =============================
WORKDIR /app/rust-engine
COPY rust-engine /app/rust-engine
RUN cargo build --release

# =============================
# 📁 Remaining Resources (plugins, scripts, engines)
# =============================
WORKDIR /app
COPY engines /app/engines
COPY scripts /app/scripts
COPY plugins /app/plugins

EXPOSE 3000

# =============================
# 🚀 Entry Point: Electron with Xvfb
# =============================
WORKDIR /app/electron-app
CMD ["sh", "-c", "Xvfb :99 -screen 0 1024x768x24 & npm start"]
