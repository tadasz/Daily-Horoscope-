# GATO — Personal Astrology App

A personalized daily horoscope service that sends readings via email based on the user's actual birth chart (not just sun sign). Built Feb 2026.

**Live:** https://gato.app

## What It Does

1. **Quiz onboarding** — 9-step quiz collects: oracle style, reading length, birth data, focus areas, relationship status, gender
2. **Birth chart calculation** — Uses NASA JPL ephemeris via Swiss Ephemeris (Flatlib) for real astronomical positions
3. **Personalized welcome email** — AI writes a "cosmic blueprint" with Big Three analysis, gifts, growth edges
4. **Daily horoscope** — Every morning at 6 AM UTC, AI reads today's transits against each user's chart
5. **Premium tier** — Longer readings (150-250 words vs 80), integrated with Creem payment

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Landing    │────▶│   Node.js   │────▶│  PostgreSQL │
│  (static)   │     │   API       │     │  (users,    │
└─────────────┘     └──────┬──────┘     │  emails)    │
                           │            └─────────────┘
                    ┌──────┴──────┐
                    │             │
              ┌─────▼─────┐ ┌─────▼─────┐
              │ Flatlib   │ │ Anthropic │
              │ (astro)   │ │ (Claude)  │
              └───────────┘ └───────────┘
                    │
              ┌─────▼─────┐
              │  Sweego   │
              │  (email)  │
              └───────────┘
```

## Tech Stack

- **API:** Node.js + Express
- **Database:** PostgreSQL (docker)
- **Astrology:** Python Flatlib + Swiss Ephemeris (docker sidecar)
- **AI:** Anthropic Claude (Opus 4.5 for LT, Haiku for EN)
- **Email:** Sweego transactional email
- **Payments:** Creem (subscription billing)
- **Hosting:** VPS with Caddy reverse proxy

## Project Structure

```
horoscope/
├── api/
│   ├── src/
│   │   ├── index.js          # Express server + routes
│   │   ├── config.js         # Environment config
│   │   ├── db.js             # PostgreSQL pool
│   │   ├── routes/
│   │   │   ├── subscribe.js  # POST /subscribe (quiz completion)
│   │   │   ├── checkout.js   # POST /checkout (Creem)
│   │   │   ├── settings.js   # GET/PUT/DELETE /api/settings/:token
│   │   │   └── ...
│   │   ├── services/
│   │   │   ├── astrology.js  # Natal chart + current sky
│   │   │   ├── horoscope.js  # Daily horoscope generation
│   │   │   ├── welcome.js    # Welcome email generation
│   │   │   ├── email.js      # Sweego send functions
│   │   │   ├── numerology.js # Life path, expression, etc.
│   │   │   └── geocode.js    # City → lat/lng/timezone
│   │   └── cron/
│   │       └── dailyHoroscope.js  # 6 AM UTC daily job
│   ├── tests/                # API tests (node --test)
│   └── package.json
├── landing/
│   ├── index.html            # Main landing page
│   ├── quiz.html             # 9-step onboarding quiz
│   ├── welcome.html          # Progress page after signup
│   ├── settings.html         # User preferences
│   ├── premium-welcome.html  # Post-payment invite page
│   └── admin.html            # Admin dashboard
├── astro/
│   ├── server.py             # Flask ephemeris API
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...
SWEEGO_API_KEY=...
CREEM_API_KEY=creem_test_...     # or creem_live_...
CREEM_PRODUCT_ID=prod_...

# Database (docker default)
DATABASE_URL=postgresql://horoscope:horoscope@db:5432/horoscope

# Optional
ADMIN_TOKEN=...                  # For /admin access
GOOGLE_MAPS_API_KEY=...          # For geocoding (or use fallback)
```

## Running Locally

```bash
cd projects/horoscope
docker compose up -d
# API at localhost:3001
```

## Key Features Implemented

### Oracle Styles (4 voices)
Each mapped to a famous astrologer's style:
- **mystic** → Rob Brezsny (poetic, mythic)
- **practical** → Susan Miller (data-driven, actionable)
- **casual** → Chani Nicholas (warm, intimate)
- **direct** → Jessica Lanyadoo (blunt, bold)

Lithuanian versions use local cultural figures (Maironis, Palmyra, Jurga Ivanauskaitė, Žemaitė).

### Reading Length (premium feature)
- **short** — ~80 words (free users locked to this)
- **medium** — ~150 words
- **long** — ~250 words

### Numerology
Welcome email includes:
- Life Path number
- Birthday number
- Expression number
- Soul Urge number
- Personal Year (2026)

### User Data Passed to LLM
- Name, gender, birth date/time/city
- Sun/Moon/Rising signs
- All planetary positions + houses + aspects
- Focus areas, relationship status
- Profile notes, initial context

## Database Schema

Key tables:
- `users` — all user data + natal_chart JSON
- `emails_sent` — log of all sent emails
- `email_events` — Sweego webhook events (opens, clicks)
- `feedback` — user feedback responses
- `replies` — email reply tracking

## URLs

- `/` — Landing page
- `/quiz` — Onboarding quiz
- `/welcome/:token` — Post-signup progress page
- `/settings/:token` — User settings (from email footer)
- `/unsubscribe/:token` — One-click unsubscribe
- `/admin` — Dashboard (requires ADMIN_TOKEN)

## Cron Jobs

- **Daily horoscope:** 6 AM UTC (configurable in `cron/dailyHoroscope.js`)

## Status (Feb 2026)

✅ Working:
- Full quiz → signup → welcome email flow
- Daily horoscope generation + delivery
- 4 oracle styles (EN + LT)
- Numerology in welcome emails
- Settings page (all preferences editable)
- Admin dashboard with stats
- Invite-a-friend viral loop
- Landing page (conversion-focused)

🔄 Partially done:
- Creem payments (checkout works, webhooks need live testing)
- Premium features (length works, more could be added)

📋 Future ideas:
- Weekly/monthly digest emails
- Compatibility readings
- Specific transit alerts
- Mobile app / PWA
- Referral tracking with incentives

## Metrics (as of Feb 3, 2026)

- ~9 users (mostly test accounts)
- 1 organic signup (Jonathan Walton)
- Emails delivered via Sweego

## Useful Commands

```bash
# View logs
docker compose logs -f api

# Run tests
cd api && npm run test:api

# Manual trigger daily horoscope
curl "https://gato.app/test/daily?email=someone@example.com"

# Check user in DB
docker compose exec db psql -U horoscope -d horoscope -c "SELECT name, email, sun_sign FROM users"
```

## Contact

Built by Tadas with Watson (AI assistant).
