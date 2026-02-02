export default {
  db: process.env.DATABASE_URL || 'postgresql://horoscope:horoscope@db:5432/horoscope',
  port: parseInt(process.env.APP_PORT || '3001'),
  appUrl: process.env.APP_URL || 'http://localhost:3001',

  // Astrology microservice
  astroUrl: process.env.ASTRO_SERVICE_URL || 'http://astro:5000',

  // Sweego (EU email)
  sweego: {
    apiKey: process.env.SWEEGO_API_KEY || '',
    fromEmail: process.env.SWEEGO_FROM_EMAIL || 'stars@example.com',
    fromName: process.env.SWEEGO_FROM_NAME || 'Your Cosmic Friend',
    replyEmail: process.env.SWEEGO_REPLY_EMAIL || 'stars@reply.gato.app',
    webhookSecret: process.env.SWEEGO_WEBHOOK_SECRET || '',
  },

  // Anthropic Claude
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',

  // Creem (EU billing)
  creem: {
    apiKey: process.env.CREEM_API_KEY || '',
    webhookSecret: process.env.CREEM_WEBHOOK_SECRET || '',
    productId: process.env.CREEM_PRODUCT_ID || '',
  },

  // Cron
  cronHourUtc: parseInt(process.env.CRON_HOUR_UTC || '6'),
  
  // Admin
  adminToken: process.env.ADMIN_TOKEN || 'gato-admin-2026',
};
