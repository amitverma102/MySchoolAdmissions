# Multi-stage production build for EduKey Admission Assist Web SPA
FROM node:20-alpine AS build

WORKDIR /app

# Cache dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Final lightweight Nginx serving stage
FROM nginx:alpine-slim AS final

# Copy custom Nginx configuration with SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled production artifacts
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
