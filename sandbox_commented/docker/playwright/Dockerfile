// FROM mcr.microsoft.com/playwright:latest
// 
// # Create app directory
// WORKDIR /usr/src/app
// 
// # Copy frontend package files and e2e tests
// COPY frontend/package.json frontend/package-lock.json* ./frontend/
// COPY frontend/e2e ./frontend/e2e
// 
// WORKDIR /usr/src/app/frontend
// 
// # Install node deps
// RUN npm ci --omit=dev || npm install
// 
// # Ensure Playwright browsers are installed
// RUN npx playwright install --with-deps || true
// 
// # Default command is to run the admin_pharmacist test
// CMD ["npx", "playwright", "test", "e2e/admin_pharmacist.spec.js", "--reporter=list"]
