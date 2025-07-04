# Base Image with Chrome & Rust
FROM node:22-slim

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
ENV PATH="/root/.cargo/bin:$PATH"

# Install system dependencies: Puppeteer headless deps, Chrome, Rust, Xvfb
RUN apt-get update && \
    apt-get install -y \
      curl wget gnupg ca-certificates build-essential \
      libgtk-3-0 libxss1 libasound2 libnss3 libx11-xcb1 libxcomposite1 \
      libxdamage1 libxrandr2 libgbm1 libxshmfence1 xdg-utils unzip \
      fonts-liberation xvfb && \
    curl https://sh.rustup.rs -sSf | bash -s -- -y && \
    wget -q -O - https://dl.google.com/linux/linux_signing_key.pub \
      | gpg --dearmor -o /usr/share/keyrings/google.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/google.gpg] http://dl.google.com/linux/chrome/deb/ stable main" \
      > /etc/apt/sources.list.d/google-chrome.list && \
    apt-get update && \
    apt-get install -y google-chrome-stable --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Install Python
RUN apt-get update && \
    apt-get install -y python3 python3-pip && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files for Electron app
COPY electron-app/package*.json ./electron-app/
COPY electron-app/vite.config.js ./electron-app/

# Install Node.js dependencies
RUN cd electron-app && npm install

# Copy all source files
COPY electron-app/ ./electron-app/
COPY rust-engine/ ./rust-engine/
COPY engines/ ./engines/
COPY scripts/ ./scripts/
COPY plugins/ ./plugins/

# Build Rust runner
RUN cd rust-engine && cargo build --release

# Expose port for potential HTTP server
EXPOSE 3000

# Start Xvfb and Electron
CMD ["sh", "-c", "Xvfb :99 -screen 0 1024x768x24 & cd electron-app && npx electron ."]
