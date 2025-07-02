FROM node:20-slim
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN apt-get update && \
    apt-get install -y wget gnupg && \
    wget -q -O - https://dl.google.com/linux/linux_signing_key.pub \
     | gpg --dearmor -o /usr/share/keyrings/google.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/google.gpg] http://dl.google.com/linux/chrome/deb/ stable main" \
     >> /etc/apt/sources.list.d/google-chrome.list && \
    apt-get update && \
    apt-get install -y google-chrome-stable fonts-ipafont-gothic \
     --no-install-recommends && rm -rf /var/lib/apt/lists/*
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
# ... copy app, install deps
