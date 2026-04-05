# 🚀 Node.js Backend Toolkit

A modern, production-ready Node.js + TypeScript + Express API starter with built-in modules for auth, users, audit, search, payments, email, file upload and real-time events.

## ✨ Key Features

- Authentication: JWT, role-based access, refresh token flow
- User management: CRUD users, profile updates, status
- Audit logging: CRUD, resource/user log query and cleanup
- Search: Elasticsearch integration with fallback when URL not set
- Database: MongoDB with Mongoose
- Cache: Redis (pub/sub, sessions, rate limit)
- Queue: Bull + ioredis for jobs (email, cleanup, scheduled)
- Notifications: Email + SMS + webhook + push events
- File Upload: Multer with local/S3 (config-driven)
- Payment: Paystack integration, payment verification
- API docs: Swagger UI / OpenAPI via route annotations
- Monitoring: health checks, correlation ID, metrics, request logging
- Security: helmet, cors, rate limiting, xss protection
- Testing: Jest + Supertest scaffolding
- Docker: compose for MongoDB/Redis + app support

## 📦 Getting Started

1. Clone repository

```bash
git clone https://github.com/your-org/nodejs-backend-toolkit.git
cd nodejs-backend-toolkit
npm install
```

2. Copy example environment

```bash
copy .env.example .env
```

3. Edit `.env` with your values

- `MONGODB_URI`, `JWT_SECRET` are required
- `REDIS_HOST`, `REDIS_PORT` for Redis
- `ELASTICSEARCH_URL` for search (if unset, search endpoints still work safely)
- `SMTP_*` for email
- `PAYSTACK_SECRET_KEY` for Paystack
- `TWILIO_*` for SMS (optional)

4. Start local development

```bash
npm run dev
```

5. Open API docs

- Swagger UI: `http://localhost:3002/api-docs`
- Health: `http://localhost:3002/health`

## 🛠️ Environment Variables

Example values from `.env.example`:

```ini
NODE_ENV=development
PORT=3002
MONGODB_URI=mongodb://localhost:27017/toolkit
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=supersecret32chars
JWT_EXPIRES_IN=1d
PAYSTACK_SECRET_KEY=
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_USERNAME=
ELASTICSEARCH_PASSWORD=
ELASTICSEARCH_API_KEY=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_BUCKET_NAME=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
```

## 🗂️ Project Structure

- `src/app.ts` – main Express app
- `src/server.ts` – starts HTTP server
- `src/config` – env, db, redis, swagger
- `src/routes` – route definitions & Swagger docs
- `src/controllers` – request handlers
- `src/services` – business logic modules
- `src/middleware` – auth/validation/error/logger
- `src/models` – Mongoose models
- `src/jobs` – Bull queue processors
- `src/utils` – helpers, validators, JWT utils

## 📌 API Routes Overview

### Auth

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

### Users

- `GET /api/users`
- `GET /api/users/:id`
- `POST /api/users`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`

### Audit

- `GET /api/audit` (all logs)
- `GET /api/audit/:id`
- `GET /api/audit/user/:userId`
- `GET /api/audit/resource/:resourceId`
- `DELETE /api/audit/cleanup`

### Search

- `POST /api/search` (Elasticsearch query)

### Payment

- `POST /api/payment/initiate`
- `POST /api/payment/verify`

### Email

- `POST /api/email/send`

### Upload

- `POST /api/upload` (local/S3 file upload)

### Monitoring

- `GET /health`
- `GET /metrics`

## 🧪 Running Tests

```bash
npm test
npm run test:coverage
```

## 🐳 Docker

```bash
docker-compose up -d mongodb redis
npm run dev
```

## � API Examples

### User Registration

```bash
curl -X POST http://localhost:3002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securepassword"
  }'
```

### User Login

```bash
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepassword"
  }'
```

### Get User Profile

```bash
curl -X GET http://localhost:3002/api/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Create Payment

```bash
curl -X POST http://localhost:3002/api/payments/initialize \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "email": "john@example.com"
  }'
```

### Export User Data (GDPR)

```bash
curl -X GET http://localhost:3002/api/users/export-my-data \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## �📈 Production Deployment

### Option 1: Docker Compose (Recommended)

1. Set environment variables in `.env.prod`

2. Run production stack:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

This includes the app, Nginx reverse proxy, MongoDB, and Redis.

### Option 2: Manual Deployment

1. Build code

```bash
npm run build
```

2. Start the app with PM2

```bash
pm2 start dist/server.js --name toolkit
```

3. Configure Nginx reverse proxy with SSL
4. Set up MongoDB/Redis securely
5. Use CI/CD for automated deployments

## 💡 Troubleshooting

- `Search service not configured` means `ELASTICSEARCH_URL` is empty; optional but set for full search behavior.
- `Route.get() requires a callback` fixed in audit controller; ensure controller exports match route declarations.
- `CORS 403` if `CORS_ORIGIN` not set (check `src/config/env.ts`).

## 🚀 Contributions

1. Fork repo
2. Create feature branch
3. Add tests and docs
4. Run formatting and lint
5. Submit PR

## 📄 License

MIT
