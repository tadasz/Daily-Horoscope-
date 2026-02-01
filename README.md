# 🔮 Daily Horoscope — AI-Powered Personalized Astrology

Email-first personalized horoscope service. Real astrology (Swiss Ephemeris / NASA JPL data) + AI that learns about you over time.

## How It Works

1. **Sign up** — enter birth data + what's on your mind
2. **Daily email** — personalized horoscope grounded in real planetary transits
3. **Reply** — answer the daily question, AI reads and remembers
4. **Over time** — readings get eerily personal as it learns about you

## Architecture

- **Astrology engine**: Kerykeion (Python, Swiss Ephemeris)
- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **Email**: Sweego (EU 🇫🇷)
- **AI**: Claude (Anthropic)
- **Billing**: Creem (EU 🇪🇺)
- **Hosting**: Docker Compose on VPS

## Setup

```bash
cp .env.example .env
# Fill in your API keys
docker compose up --build
```

## License

Private — all rights reserved.
