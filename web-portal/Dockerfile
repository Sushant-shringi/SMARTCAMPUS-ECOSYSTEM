FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build-time environment variables for Vite client bundle
ARG VITE_ATTENDANCE_API_URL=http://localhost:8005/api/v1
ARG VITE_CAREER_API_URL=http://localhost:8001/api

ENV VITE_ATTENDANCE_API_URL=$VITE_ATTENDANCE_API_URL \
    VITE_CAREER_API_URL=$VITE_CAREER_API_URL

RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
