# 🚀 Node.js Backend Toolkit

Comprehensive production-ready Node.js + TypeScript + Express toolkit with 50+ features.

## ✨ Features

- **Security:** Helmet, CORS, Rate limiting, JWT, bcrypt, encryption
- **Database:** Mongoose ODM, MongoDB
- **Cache:** Redis
- **Queue:** Bull + ioredis (jobs, retries)
- **Search:** Elasticsearch ready
- **Payment:** Paystack
- **File Upload:** Multer + S3/Local
- **Email:** Nodemailer templates
- **WebSocket:** Socket.io real-time
- **Validation:** Joi + express-validator
- **Logging:** Winston (files/console)
- **Monitoring:** Health, audit logs
- **Middleware:** Compression, sanitization, error handling
- **Utils:** Async handler, API response, pagination
- **Jobs:** Cron-like (email, cleanup)
- **Testing:** Jest + Supertest
- **Docker:** Compose for Mongo/Redis

## 📦 Quick Start

1. **Clone & Install:**

```
git clone <repo>
cd nodejs-backend-toolkit
npm install
```

2. **Copy .env:**

```
cp .env.example .env
# Edit .env (JWT_SECRET required, Redis optional)
```

3. **Run:**

```
npm run dev
```

4. **Test:**

```
curl http://localhost:3000/health
```

## 🐳 Docker (full stack)

```
docker-compose up -d mongodb redis
npm run dev
```

## 📁 Architecture

```
src/
├── app.ts           # Express app setup
├── server.ts        # Server entry
├── config/          # DB, Redis, env
├── controllers/     # User, Auth, Audit
├── middleware/      # Auth, validation, rate-limit
├── models/          # Mongoose schemas
├── routes/          # API routes
├── services/        # Business logic (Email, Payment, Queue, Search, Cache)
├── utils/           # Helpers (logger, jwt, upload, validators)
└── jobs/            # Bull jobs
```

## 🔧 Environment (.env)

```
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/toolkit
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-32-char-secret
# Optional:
PAYSTACK_SECRET_KEY=sk_test_...
AWS_ACCESS_KEY_ID=
ELASTICSEARCH_URL=
SMTP_HOST=smtp.gmail.com
```

## 🚀 API Endpoints

- `GET /health` - Health check
- `POST /api/auth/register` - User register
- `POST /api/auth/login` - Login
- `GET /api/users` - Paginated users (search, filter)
- `WS ws://localhost:3000` - Real-time

## 🧪 Testing

```
npm test
npm run test:coverage
```

## Scripts

```
npm run dev     # Dev server
npm run build   # Production build
npm run start   # Prod server
npm run lint    # ESLint
npm run format  # Prettier
npm run docker:up  # Docker stack
```

## 📈 Production Deploy

1. Build: `npm run build`
2. PM2/Docker
3. Redis/Mongo prod (AWS RDS, Redis Cloud)
4. Nginx reverse proxy

## 🤝 Contributing

1. Fork & PR
2. `npm run format`
3. Tests pass

## License

MIT
