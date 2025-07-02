FROM node:20-bullseye
# Install Rust, Docker CLI, Python, Go, Phantom Vite, etc.
# Copy electron-app, rust-engine, engines, plugins, scripts
# Build Rust binary
# Install Electron dependencies
CMD ["./entrypoint.sh"]
