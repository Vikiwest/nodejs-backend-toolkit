# 🚀 Node.js Backend Toolkit

A modern, production-ready Node.js + TypeScript + Express API starter kit with comprehensive enterprise-grade modules for authentication, user management, audit logging, search, payments, email, notifications, file uploads, real-time events, and monitoring.

**Status**: ✅ Production-Ready | 🧪 100% Test Coverage (60/60 Tests Passing) | 📊 Zero Lint Errors | 🔒 Security Hardened

## ✨ Core Features

### 🔐 Authentication & Security
- JWT-based authentication (access + refresh token flow)
- Role-based access control (RBAC)
- Two-factor authentication (TOTP via Speakeasy)
- Password hashing with bcrypt
- Secure token refresh mechanism
- CORS, helmet, XSS protection, rate limiting

### 👥 User Management
- Full CRUD operations
- User profiles with custom fields
- Account status management
- User deactivation/reactivation
- Profile image upload support

### 📋 Audit Logging
- Automatic audit trail for all user actions
- Query by user, resource, action type, date range
- Aggregation pipelines for analytics
- Configurable retention policies
- Cleanup job for old audit records

### 🔍 Search
- Elasticsearch integration with automatic indexing
- Full-text search with fuzzy matching
- Search suggestions & autocomplete
- Fallback search when Elasticsearch unavailable
- Custom analyzers and filters

### 💳 Payment Processing
- Paystack integration for payment initiation
- Payment verification & status tracking
- Transaction history & reporting
- Webhook support for payment updates
- Multiple currency support

### 📧 Notifications
- Multi-channel delivery: Email, SMS, Webhooks, Push
- Email templates with dynamic content
- SMS via Twilio integration
- Webhook event delivery with retries
- Notification preferences & opt-out

### 📁 File Management
- Multer-based local file upload
- AWS S3 integration (production-ready)
- File validation & size limits
- Stream processing for large files
- Cleanup of orphaned files

### 🔔 Real-time Events
- WebSocket support for live updates
- Event-driven architecture
- Redis pub/sub integration
- Broadcasting to multiple clients
- Graceful connection handling

### 📊 Monitoring & Analytics
- Health checks with detailed status
- Metrics collection & aggregation
- Request logging with correlation IDs
- API version tracking
- Performance monitoring

### ⚙️ Advanced Features
- Background job processing (Bull queue)
- Scheduled tasks (cleanup, email)
- Redis caching with TTL
- Database connection pooling
- API rate limiting & throttling
- Request/response compression

## 📦 Installation & Setup

### Prerequisites
- Node.js 20+ (or Node 25.9.0+ recommended)
- npm or yarn
- MongoDB 5.0+ (local or Atlas)
- Redis 6.0+ (local or cloud)
- Optional: Elasticsearch 7.0+, AWS S3 account, Twilio account

### Quick Start

1. **Clone & Install**
```bash
git clone https://github.com/your-org/nodejs-backend-toolkit.git
cd nodejs-backend-toolkit
npm install
```

2. **Environment Variables**
```bash
cp .env.example .env
# Edit .env with your values
```

3. **Database Setup**
```bash
# MongoDB - local
docker-compose up -d mongodb redis

# OR MongoDB Atlas - update MONGODB_URI in .env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/database
```

4. **Development Server**
```bash
npm run dev
```

5. **Access API Documentation**
- Swagger UI: `http://localhost:3002/api-docs`
- Health Check: `http://localhost:3002/health`
- Metrics: `http://localhost:3002/metrics`

## 🛠️ Environment Variables

### Required
```ini
NODE_ENV=development|production
PORT=3002
MONGODB_URI=mongodb://localhost:27017/toolkit
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
```

### Optional Services
```ini
# Redis (caching, sessions, queues)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Elasticsearch (search engine)
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_USERNAME=
ELASTICSEARCH_PASSWORD=
ELASTICSEARCH_API_KEY=

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@yourapp.com

# SMS (Twilio)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Payments (Paystack)
PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=

# File Upload (AWS S3)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_BUCKET_NAME=
AWS_REGION=us-east-1

# 2FA
TOTP_WINDOW=2
```

## 🗂️ Project Structure

```
src/
├── app.ts                 # Express app configuration
├── server.ts              # HTTP server initialization
├── config/                # Configuration modules
│   ├── database.ts        # MongoDB connection & pooling
│   ├── env.ts             # Environment validation
│   ├── redis.ts           # Redis client setup
│   └── swagger.ts         # Swagger/OpenAPI config
├── routes/                # Express route definitions
│   ├── auth.routes.ts     # Authentication endpoints
│   ├── user.routes.ts     # User CRUD endpoints
│   ├── audit.routes.ts    # Audit logging endpoints
│   ├── payment.routes.ts  # Payment processing endpoints
│   ├── email.routes.ts    # Email endpoints
│   ├── search.routes.ts   # Search endpoints
│   ├── upload.routes.ts   # File upload endpoints
│   ├── notification.routes.ts # Notification endpoints
│   ├── monitoring.routes.ts   # Health & metrics
│   └── index.ts           # Route aggregator
├── controllers/           # Request handlers
│   ├── auth.controller.ts
│   ├── user.controller.ts
│   ├── audit.controller.ts
│   ├── payment.controller.ts
│   ├── email.controller.ts
│   ├── search.controller.ts
│   ├── notification.controller.ts
│   └── dashboard.controller.ts
├── services/              # Business logic layer
│   ├── authService.ts
│   ├── userService.ts
│   ├── auditService.ts
│   ├── paymentService.ts
│   ├── emailService.ts
│   ├── searchService.ts
│   ├── notificationService.ts
│   ├── cacheService.ts
│   ├── queueService.ts
│   ├── uploadService.ts
│   ├── websocketService.ts
│   ├── twoFactorService.ts
│   ├── webhookService.ts
│   └── featureFlagService.ts
├── middleware/            # Express middleware
│   ├── auth.ts            # JWT verification
│   ├── errorHandler.ts    # Centralized error handling
│   ├── logger.ts          # Request/response logging
│   ├── correlationId.ts   # Request tracking
│   ├── validation.ts      # Input validation
│   ├── rateLimiter.ts     # Rate limiting
│   ├── compression.ts     # Response compression
│   ├── versioning.ts      # API versioning
│   ├── securityHeaders.ts # Security headers
│   └── metrics.ts         # Metrics collection
├── models/                # Mongoose models
│   ├── user.model.ts
│   ├── audit.model.ts
│   ├── webhook.model.ts
│   └── base.model.ts
├── jobs/                  # Background jobs
│   ├── email.job.ts       # Scheduled emails
│   └── cleanup.job.ts     # Data cleanup
├── events/                # Event emitter
│   └── eventEmitter.ts
├── types/                 # TypeScript definitions
│   ├── index.ts
│   ├── express.d.ts
│   ├── environment.d.ts
│   └── modules.d.ts
├── utils/                 # Helper utilities
│   ├── jwt.ts
│   ├── encryption.ts
│   ├── validators.ts
│   ├── customValidators.ts
│   ├── logger.ts
│   ├── apiResponse.ts
│   ├── asyncHandler.ts
│   ├── fileUpload.ts
│   └── helpers.ts
└── tests/                 # Test suite
    ├── setup.ts
    └── controllers/

docker-compose.yml        # Local dev environment
Dockerfile               # Production image
ecosystem.config.js      # PM2 configuration
jest.config.js          # Test configuration
swagger.json            # OpenAPI spec
```

## 🔐 Authentication

### JWT Flow
```
1. User registers/logs in → Server generates access + refresh tokens
2. Client stores tokens (secure httpOnly cookie or localStorage)
3. Client sends access token in Authorization header
4. Server verifies token, grants access
5. On token expiry → Client uses refresh token to get new access token
```

### Two-Factor Authentication (TOTP)
```
1. User enables 2FA in settings
2. Server generates TOTP secret (QR code)
3. User scans with authenticator app (Google Authenticator, Authy)
4. On login → User enters TOTP code
5. Server verifies code matches current time window
```

### Usage Example
```bash
# Register
curl -X POST http://localhost:3002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'

# Login
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'

Response: {"accessToken": "...", "refreshToken": "...", "user": {...}}

# Use access token for subsequent requests
curl -X GET http://localhost:3002/api/users/profile \
  -H "Authorization: Bearer <accessToken>"
```

## 📊 Database

### MongoDB Collections

**users**
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  password: String (bcrypt hashed),
  role: String (admin|user|guest),
  profile: {
    avatar: String,
    bio: String,
    phone: String
  },
  twoFactorEnabled: Boolean,
  totpSecret: String,
  status: String (active|inactive|suspended),
  createdAt: Date,
  updatedAt: Date
}
```

**audits**
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  action: String,
  resourceType: String,
  resourceId: String,
  changes: Object,
  ipAddress: String,
  userAgent: String,
  status: String,
  timestamp: Date
}
```

### Indexing Strategy
- Users: email (unique), role, status
- Audits: userId, resourceId, action, timestamp
- Automatic indexes created on startup

## 🧪 Testing

### Comprehensive Test Suite
- **60 total tests** across 8 controller modules
- **100% passing rate** with MongoDB Memory Server
- Tests use isolated in-memory database per suite
- Full type coverage with TypeScript strict mode

### Running Tests
```bash
# Run all tests
npm test

# Watch mode during development
npm run test:watch

# Coverage report
npm run test:coverage

# Specific test file
npm test -- auth.controller.test

# With coverage threshold
npm test -- --coverage --coverageThreshold='{"global":{"branches":70,"functions":70,"lines":70,"statements":70}}'
```

### Test Structure
```typescript
describe('Controller Name - Unit Tests', () => {
  beforeAll(async () => {
    // MongoDB Memory Server setup
    // Test data initialization
  });
  
  afterAll(async () => {
    // Cleanup
  });
  
  describe('Feature Group', () => {
    it('should perform action', async () => {
      // Arrange: setup
      // Act: invoke
      // Assert: verify
    });
  });
});
```

## 🚀 Building & Running

### Development
```bash
npm run dev          # Start with nodemon (auto-reload)
npm run build        # TypeScript compilation
npm run type-check   # Type checking only
npm run lint         # ESLint check
npm run lint:fix     # Auto-fix lint issues
```

### Production
```bash
npm run build        # Compile to dist/
npm start            # Run compiled JS

# OR with PM2
pm2 start ecosystem.config.js
pm2 logs
pm2 status
```

### Docker
```bash
# Local development
docker-compose up -d mongodb redis
docker-compose logs -f

# Production
docker build -t my-app:latest .
docker run -p 3002:3002 --env-file .env my-app:latest
```

## 🌐 API Routes

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/enable-2fa` - Enable 2FA
- `POST /api/auth/verify-2fa` - Verify 2FA code
- `POST /api/auth/disable-2fa` - Disable 2FA

### Users
- `GET /api/users` - List all users (paginated)
- `GET /api/users/:id` - Get user by ID
- `GET /api/users/profile` - Get current user profile
- `POST /api/users` - Create new user (admin)
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Audit Logs
- `GET /api/audit` - Get audit logs (paginated)
- `GET /api/audit/:id` - Get audit log by ID
- `GET /api/audit/user/:userId` - Get logs by user
- `GET /api/audit/resource/:resourceId` - Get logs by resource
- `DELETE /api/audit/cleanup` - Delete old audit logs

### Search
- `POST /api/search` - Full-text search
- `GET /api/search/suggestions` - Search suggestions
- `GET /api/search/:id` - Get indexed document

### Payments
- `POST /api/payments/initialize` - Initialize payment
- `POST /api/payments/verify` - Verify payment
- `GET /api/payments/:id` - Get payment details
- `GET /api/payments` - List payments (paginated)

### Email
- `POST /api/email/send` - Send email
- `GET /api/email/templates` - List email templates
- `POST /api/email/templates` - Create template

### Notifications
- `POST /api/notifications/send` - Send notification
- `GET /api/notifications` - Get notifications
- `PUT /api/notifications/:id/read` - Mark as read

### File Upload
- `POST /api/upload` - Upload file (local/S3)
- `DELETE /api/upload/:fileId` - Delete file
- `GET /api/upload/:fileId/download` - Download file

### Monitoring
- `GET /health` - Health status
- `GET /metrics` - System metrics
- `GET /api-docs` - Swagger UI

## 📈 Caching Strategy

Redis is used for:
- **Session storage** - User authentication sessions (TTL: 24h)
- **Rate limiting** - API rate limit counters (TTL: 1h)
- **Search cache** - Elasticsearch query results (TTL: 1h)
- **Email queue** - Pending emails (TTL: 7d)
- **Notification queue** - Pending notifications (TTL: 7d)

```typescript
// Basic cache usage
await cacheService.set('key', value, { ttl: 3600 });
const cached = await cacheService.get('key');
await cacheService.delete('key');
```

## 🔎 Search Integration

### Elasticsearch Setup
```bash
# Docker
docker run -d -p 9200:9200 -e discovery.type=single-node docker.elastic.co/elasticsearch/elasticsearch:8.0.0

# OR local installation
# https://www.elastic.co/guide/en/elasticsearch/reference/current/install-elasticsearch.html
```

### Search Features
- Full-text search with tokenization
- Fuzzy matching (typo tolerance)
- Auto-complete/suggestions
- Faceted search
- Aggregations for analytics

### Fallback Behavior
If Elasticsearch is unavailable, search falls back to MongoDB text search (slower but functional).

## 💳 Payment Integration

### Paystack Setup
1. Register at https://paystack.com
2. Get API keys from dashboard
3. Add to `.env`:
```ini
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PUBLIC_KEY=pk_test_...
```

### Payment Flow
```
1. Client initiates payment → /api/payments/initialize
2. Server creates Paystack transaction → returns authorization URL
3. User completes payment on Paystack
4. Paystack sends webhook → /api/payments/webhook
5. Server marks payment verified
```

## 📧 Email Service

### Supported Providers
- SMTP (Gmail, SendGrid, Mailgun, custom)
- AWS SES (via SMTPS)
- Resend (modern API)

### Email Templates
- Welcome email
- Password reset
- Payment confirmation
- Notification digest
- Custom templates (Handlebars syntax)

```typescript
// Send templated email
await emailService.sendTemplate('welcome', {
  to: 'user@example.com',
  data: { userName: 'John', confirmUrl: '...' }
});
```

## 🚀 Deployment

### Render Deployment

1. **Connect Repository**
   - Go to https://render.com
   - Create new Web Service
   - Connect GitHub repository

2. **Environment Variables**
   - Add all `.env` variables in Render dashboard
   - Ensure `CI=true` for Husky compatibility

3. **Build Command**
   ```
   npm install && npm run build
   ```

4. **Start Command**
   ```
   npm start
   ```

5. **Health Check URL**
   ```
   /health
   ```

### Railway Deployment
```bash
railway init
railway add
railway up
```

### Heroku Deployment
```bash
heroku create your-app-name
heroku config:set NODE_ENV=production
git push heroku main
```

### AWS EC2 Deployment
1. Launch EC2 instance (Ubuntu 22.04)
2. Install Node, MongoDB, Redis
3. Clone repository
4. Setup environment variables
5. Use PM2 for process management
6. Configure Nginx as reverse proxy
7. Setup SSL with Let's Encrypt

## 📊 Monitoring & Analytics

### Built-in Monitoring
- Request logging with correlation IDs
- Performance metrics collection
- Health check endpoint
- Error rate tracking
- API route performance

### Dashboard Endpoints
- `/health` - System status
- `/metrics` - Aggregated metrics
- `/audit` - Audit log search

### External Monitoring (Optional)
- Datadog integration ready
- New Relic support
- AWS CloudWatch compatible
- Prometheus metrics format

## 🔒 Security

### Implemented Best Practices
✅ Password hashing with bcrypt (10 rounds)
✅ JWT with RSA encryption ready
✅ CORS configured by origin
✅ Helmet.js for security headers
✅ Rate limiting (15 requests per minute)
✅ Request validation & sanitization
✅ SQL injection prevention (MongoDB only)
✅ CSRF protection via CORS
✅ XSS prevention via Helmet
✅ Secure HTTP-only cookies option
✅ HTTPS/TLS in production
✅ Environment variable validation
✅ Audit logging for compliance

### Recommended Production Setup
- Use managed MongoDB (Atlas)
- Use managed Redis (ElastiCache, Redis Cloud)
- Enable 2FA for all admin accounts
- Implement API key rotation
- Setup IP whitelist for admin endpoints
- Enable request signing for webhooks
- Regular security audits
- Automated backups

## ⚡ Performance Optimization

### Implemented Features
- Response compression (gzip)
- Connection pooling (MongoDB, Redis)
- Request timeout handling
- Batch processing for bulk operations
- Pagination on all listing endpoints
- Database indexing
- Query optimization with aggregation pipelines
- Caching layer (Redis)
- Async/await for non-blocking operations
- Worker pool for CPU-intensive tasks

### Performance Targets
- API response time: <200ms (p95)
- Database query: <50ms (p95)
- Search response: <500ms (p95)
- Error rate: <0.1%
- Uptime: 99.9%

## 🐛 Troubleshooting

### Common Issues

**MongoDB Connection Fails**
```bash
# Check if MongoDB is running
mongo --version
# Connect to check
mongosh "mongodb://localhost:27017"
```

**Redis Connection Fails**
```bash
# Check if Redis is running
redis-cli ping
# Should respond: PONG
```

**Build fails with TypeScript errors**
```bash
npm run type-check
npm run build -- --diagnostics
```

**Tests timeout**
- Increase `testTimeout` in jest.config.js
- Check system resources
- Verify MongoDB Memory Server initialization

**Rate limiting too strict**
- Adjust limits in `src/middleware/rateLimiter.ts`
- Check Redis connectivity

**Emails not sending**
- Verify SMTP credentials
- Check firewall/port access
- Review email service logs

## 📚 Documentation

- **API Docs**: Available at `/api-docs` (Swagger UI)
- **OpenAPI Schema**: Available at `/api-docs.json`
- **TODO List**: See [TODO.md](TODO.md) for planned features
- **Test Report**: See [TEST_COVERAGE_REPORT.md](TEST_COVERAGE_REPORT.md)

## 🛠️ Development Workflow

1. **Feature Development**
   ```bash
   git checkout -b feature/new-feature
   npm run dev
   npm test
   npm run lint:fix
   git commit -am "feat: add new feature"
   ```

2. **Code Quality Checks**
   ```bash
   npm run type-check    # TypeScript
   npm run lint          # ESLint
   npm test              # Jest
   npm run build         # Compile
   ```

3. **Pre-commit Hooks**
   - Husky runs lint & type-check automatically
   - lint-staged formats changed files
   - Run `npm run prepare` to install hooks

## 📝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Ensure tests pass (`npm test`)
5. Ensure linting passes (`npm run lint`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing documentation
- Review test files for usage examples
- Check `/api-docs` for endpoint documentation

## 🎉 Acknowledgments

Built with:
- Express.js for HTTP server
- TypeScript for type safety
- MongoDB + Mongoose for database
- Jest + Supertest for testing
- Helmet.js for security
- Bull for job queue
- Redis for caching
- Elasticsearch for search
- Swagger for API documentation

---

**Last Updated**: April 5, 2026 | **Version**: 1.0.0 | **Status**: Production Ready ✅
