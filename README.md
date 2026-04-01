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
- Notifications: Email + webhook + push events
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

## 📈 Production Deployment

1. Build code

```bash
npm run build
```

2. Start the app with preferred process manager

- `pm2 start dist/server.js --name toolkit`

3. Use reverse proxy (Nginx) with HTTPS
4. Configure MongoDB/Redis/AWS/Paystack securely
5. Set environment variables in CI/CD

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
