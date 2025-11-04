// # Multi-stage Dockerfile for React frontend with TailwindCSS
// # Stage 1: Build the React app using Node
// FROM node:18-alpine AS builder
// 
// # Set working directory
// WORKDIR /app
// 
// # Copy package files
// COPY package*.json ./
// 
// # Install dependencies
// RUN npm ci --only=production=false
// 
// # Copy source code
// COPY . .
// 
// # Build the app for production
// RUN npm run build
// 
// # Stage 2: Serve with Nginx
// FROM nginx:alpine
// 
// # Copy built assets from builder stage
// COPY --from=builder /app/dist /usr/share/nginx/html
// 
// # Copy custom Nginx config (if needed, create nginx.conf for proxy to backend)
// COPY nginx.conf /etc/nginx/conf.d/default.conf
// 
// # Expose port 80
// EXPOSE 80
// 
// # Start Nginx
// CMD ["nginx", "-g", "daemon off;"]
