declare namespace NodeJS {
  interface ProcessEnv {
    PORT: string;
    NODE_ENV: 'development' | 'production' | 'test';
    APP_NAME: string;
    MONGODB_URI: string;
    MONGODB_URI_PROD: string;
    REDIS_HOST: string;
    REDIS_PORT: string;
    REDIS_PASSWORD: string;
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    JWT_REFRESH_SECRET: string;
    JWT_REFRESH_EXPIRES_IN: string;
    PAYSTACK_SECRET_KEY: string;
    // New Email config (replacing SMTP)
    EMAIL_HOST: string;
    EMAIL_PORT: string;
    EMAIL_USER: string;
    EMAIL_PASS: string;
    EMAIL_FROM: string;
    MAX_FILE_SIZE: string;
    ALLOWED_FILE_TYPES: string;
    RATE_LIMIT_WINDOW_MS: string;
    RATE_LIMIT_MAX: string;
    ELASTICSEARCH_URL: string;
    ELASTICSEARCH_API_KEY: string;
    ELASTIC_APM_SERVER_URL: string;
    ELASTIC_APM_SECRET_TOKEN: string;
    UNLEASH_URL: string;
    UNLEASH_INSTANCE_ID: string;
    ENCRYPTION_KEY: string;
    ENCRYPTION_IV: string;
    APP_URL: string;
  }
}
