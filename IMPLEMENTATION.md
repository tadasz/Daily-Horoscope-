# Horoscope App — Full Implementation Plan

## What I Need From Tadas

1. **GitHub repo** — create a repo (e.g., `tadas/horoscope-app` or whatever name you want) and give me access. I need:
   - Repo name / URL
   - A personal access token (PAT) with repo permissions, OR invite my deploy key

2. **Domain name** — pick a name and register it. We need it for:
   - Landing page (e.g., starwhisper.app)
   - Email sending (hello@starwhisper.app)
   - Sweego requires domain DNS verification

3. **Sweego account** — sign up at sweego.io (free tier), get API key

4. **Creem account** — sign up at creem.io (free tier, 0% fees until €1K revenue), set up a product/subscription

5. **LLM API key** — either:
   - Anthropic (Claude) API key, OR
   - OpenAI API key
   - (I'd recommend Claude for the warm/wise tone — but either works)

6. **Your birth data** — for testing 😄 (date, time if you know it, city)

---

## Astrology Data — The Engine

### What we need to generate a legit daily horoscope:

**A) For each user (calculated ONCE on signup):**
- Sun sign (which zodiac sign the Sun was in at birth)
- Moon sign (needs birth time — which zodiac sign the Moon was in)
- Rising sign / Ascendant (needs birth time — the sign on the eastern horizon)
- All planet positions in signs (Mercury, Venus, Mars, Jupiter, Saturn, etc.)
- House placements (which life areas each planet rules for them)
- Key natal aspects (e.g., "Venus square Saturn" = challenge in relationships)

**B) For TODAY (calculated daily, same for everyone):**
- Current positions of all planets (which sign, which degree)
- Today's Moon sign + phase (new/waxing/full/waning)
- Key transit aspects (e.g., "Mars conjunct Jupiter today")
- Any retrogrades (Mercury retrograde, etc.)

**C) For each user TODAY (the personalization):**
- Which current planets aspect THEIR natal planets
- e.g., "Transiting Saturn is conjunct your natal Venus" = relationship pressure period
- Which houses are being activated by current transits

### How we calculate this:

**Option 1: Swiss Ephemeris via Node.js (self-hosted, FREE)**
- `sweph` npm package — Node.js bindings to Swiss Ephemeris
- NASA JPL DE431 precision
- Calculates exact planetary positions for any date/time/place
- We'd need to build the astrology layer on top (signs, houses, aspects)
- More work but zero ongoing cost, full control

**Option 2: Kerykeion Python library (self-hosted, FREE)**
- Open source Python library built on Swiss Ephemeris
- Higher-level: directly gives you signs, houses, aspects, transits
- Can run as a small Python microservice alongside our Node.js app
- Or call via `child_process` from Node
- Best balance of effort vs features

**Option 3: Astrologer API (hosted, PAID)**
- Kerykeion's commercial REST API via RapidAPI
- Has special `/context` endpoints designed for LLM integration!
- Returns AI-ready text descriptions of chart data
- Free tier: 100 requests/month (not enough for daily use)
- Paid: $10-50/month depending on usage
- Easiest but adds a dependency + cost

### Recommendation: Kerykeion (Python) as local microservice

- Free, self-hosted, full control
- Mature library, actively maintained
- Calculates everything we need
- We build a tiny Flask/FastAPI wrapper with 2 endpoints:
  - `POST /natal-chart` → birth data → full chart JSON
  - `POST /daily-transits` → date + natal data → today's transits for this person
- Node.js app calls this microservice locally

### Astrology 101 — What makes a reading sound legit:

| Concept | What it is | Example in horoscope |
|---------|-----------|---------------------|
| **Sun sign** | Your core identity (based on birth date) | "As a Scorpio..." |
| **Moon sign** | Your emotional nature (needs birth time) | "Your Pisces Moon makes you extra sensitive today" |
| **Rising sign** | How others see you (needs birth time) | "With Sagittarius rising, you come across as restless" |
| **Houses** | 12 life areas (career=10th, love=7th, money=2nd...) | "Mars entering your 10th house = career push" |
| **Transits** | Current planets hitting your natal chart | "Saturn is crossing your Venus = relationship test" |
| **Aspects** | Geometric angles between planets | "Moon square Mercury = foggy thinking" |
| **Moon phase** | New/Waxing/Full/Waning | "Under today's waning Moon, release what isn't serving you" |
| **Retrograde** | Planet appears to move backward | "Mercury retrograde in your 3rd house = communication snags" |

The LLM prompt will receive all this data in structured form and weave it into a natural, personal-sounding reading.

---

## Technical Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Docker Compose                      │
│                                                        │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  PostgreSQL  │  │  Node.js API │  │   Kerykeion  │ │
│  │    :5432     │  │    :3001     │  │  (Python)    │ │
│  │              │←─│              │─→│    :5000     │ │
│  └─────────────┘  └──────┬───────┘  └──────────────┘ │
│                          │                             │
└──────────────────────────┼─────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────┴────┐ ┌────┴─────┐ ┌───┴──────┐
        │  Sweego   │ │  Claude  │ │  Creem   │
        │  (email)  │ │  (LLM)  │ │ (billing)│
        └──────────┘ └──────────┘ └──────────┘
```

### Services:

**1. PostgreSQL** — user data, emails sent, replies, feedback
**2. Node.js API** — main backend (Express/Fastify)
  - Landing page form handler
  - Daily cron (generate + send horoscopes)
  - Sweego webhook (inbound replies)
  - Creem webhook (subscription events)
  - Unsubscribe handler
**3. Kerykeion microservice** — Python FastAPI
  - Natal chart calculation
  - Daily transit calculation
  - No external dependencies, all local computation

### External services:

**4. Sweego** 🇫🇷 — send daily emails, receive reply webhooks
**5. Claude/OpenAI** — generate personalized horoscope text
**6. Creem** 🇪🇺 — subscription billing, EU merchant of record

---

## Project Structure

```
horoscope-app/
├── docker-compose.yml
├── .env.example
├── .gitignore
│
├── landing/                    # Static landing page
│   ├── index.html
│   ├── style.css
│   └── thanks.html            # Post-signup thank you
│
├── api/                        # Node.js backend
│   ├── package.json
│   ├── Dockerfile
│   ├── src/
│   │   ├── index.js           # Express app entry
│   │   ├── config.js          # Environment config
│   │   ├── db.js              # PostgreSQL connection
│   │   ├── routes/
│   │   │   ├── subscribe.js   # POST /subscribe
│   │   │   ├── webhook.js     # POST /webhook/email (Sweego inbound)
│   │   │   ├── billing.js     # POST /webhook/billing (Creem)
│   │   │   └── unsubscribe.js # GET /unsubscribe/:token
│   │   ├── services/
│   │   │   ├── astrology.js   # Calls Kerykeion microservice
│   │   │   ├── horoscope.js   # LLM prompt builder + generator
│   │   │   ├── email.js       # Sweego send/template
│   │   │   ├── memory.js      # User context/memory management
│   │   │   └── billing.js     # Creem subscription checks
│   │   ├── cron/
│   │   │   └── dailyHoroscope.js  # Morning cron job
│   │   └── prompts/
│   │       ├── daily.txt      # System prompt for daily horoscope
│   │       ├── followup.txt   # System prompt for reply follow-ups
│   │       └── questions.txt  # Pool of reflective questions
│   └── migrations/
│       └── 001_initial.sql    # Database schema
│
├── astro/                      # Kerykeion Python microservice
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app.py                 # FastAPI app
│   └── astro_service.py       # Chart + transit calculations
│
└── README.md
```

---

## Database Schema

```sql
-- Users
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT UNIQUE NOT NULL,
  name            TEXT,
  birth_date      DATE NOT NULL,
  birth_time      TIME,                    -- nullable
  birth_city      TEXT,
  birth_lat       DECIMAL(9,6),
  birth_lng       DECIMAL(9,6),
  timezone        TEXT,
  -- Natal chart (calculated on signup, stored as JSON)
  natal_chart     JSONB,                   -- full chart data from Kerykeion
  sun_sign        TEXT,
  moon_sign       TEXT,                    -- null if no birth time
  rising_sign     TEXT,                    -- null if no birth time
  -- Profile & preferences
  focus_area      TEXT,                    -- love/career/health/growth/money
  initial_context TEXT,                    -- "what's on your mind" from signup
  profile_notes   TEXT DEFAULT '',         -- AI-curated summary of what we know
  raw_context     JSONB DEFAULT '[]',      -- array of learned facts from replies
  -- Subscription
  subscription    TEXT DEFAULT 'free',     -- free / premium
  creem_customer_id TEXT,
  -- Meta
  subscribed      BOOLEAN DEFAULT TRUE,
  unsub_token     UUID DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Sent emails log
CREATE TABLE emails_sent (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  sent_at         TIMESTAMPTZ DEFAULT NOW(),
  email_type      TEXT DEFAULT 'daily',    -- daily/weekly/followup/welcome
  subject         TEXT,
  body_text       TEXT,
  question_asked  TEXT,
  transit_summary TEXT,                    -- what astro data was used
  sweego_id       TEXT                     -- Sweego message ID for tracking
);

-- Inbound replies
CREATE TABLE replies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  email_id        UUID REFERENCES emails_sent(id),
  reply_text      TEXT NOT NULL,
  ai_followup     TEXT,                    -- our response
  key_insight     TEXT,                    -- extracted insight for memory
  received_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_subscribed ON users(subscribed) WHERE subscribed = TRUE;
CREATE INDEX idx_emails_user ON emails_sent(user_id, sent_at DESC);
CREATE INDEX idx_replies_user ON replies(user_id, received_at DESC);
```

---

## Build Order (Step by Step)

### Phase 1: Foundation (Day 1-2)

1. **Set up GitHub repo** (need Tadas's input)
2. **Docker Compose** — PostgreSQL + Node.js + Kerykeion Python service
3. **Database migrations** — run schema
4. **Kerykeion microservice** — Python FastAPI with 2 endpoints:
   - `POST /natal-chart` — input: birth data → output: full chart JSON
   - `POST /daily-transits` — input: date + user's natal data → output: today's transits
5. **Test astrology calculations** — verify accuracy with known birth charts

### Phase 2: Core Email Flow (Day 3-4)

6. **Sweego integration** — send emails, verify domain
7. **Subscribe endpoint** — receive form data, geocode city, calculate natal chart, store user, send welcome email
8. **LLM horoscope generator** — build the prompt template, test with Claude
9. **Daily cron job** — for each subscribed user: get transits → build prompt → call LLM → send email
10. **Test full flow** — sign up → receive daily email next morning

### Phase 3: Replies & Memory (Day 5-6)

11. **Sweego inbound webhook** — receive replies, match to user
12. **AI follow-up generator** — LLM generates warm response referencing their chart
13. **Memory system** — extract insights from replies, store in user profile
14. **Feed memory into daily horoscope** — tomorrow's email references what they told you
15. **Test the learning loop** — reply → follow-up → next day's email is more personal

### Phase 4: Billing & Landing Page (Day 7-8)

16. **Landing page** — clean HTML/CSS, form, hosted on same server
17. **Creem integration** — subscription checkout, webhook for payment events
18. **Paywall logic** — free users: no reply processing. Premium: full experience.
19. **Auto-reply for free users** — "Upgrade to Premium" message when they reply
20. **Unsubscribe flow** — one-click unsubscribe link in every email

### Phase 5: Polish & Launch (Day 9-10)

21. **Email template design** — beautiful, minimal, mobile-first
22. **Error handling** — retry failed emails, handle webhook errors
23. **Logging & monitoring** — track sends, opens, replies
24. **README & documentation**
25. **Deploy & test end-to-end**
26. **Beta launch** — share with friends/family

---

## Hosting Plan (this server)

Current server: 3.7GB RAM, 25GB free disk, Docker, Node 22, Python 3.12

We'll add a new docker-compose stack:
- PostgreSQL (can share the existing instance or create a separate one)
- Node.js API on port 3001
- Kerykeion Python on port 5000 (internal only)
- Landing page served by Node.js or nginx

The server has plenty of capacity for this.

---

## LLM Prompt Architecture

### Daily Horoscope Prompt (free tier)

```
SYSTEM:
You are a warm, knowledgeable astrologer writing a personal daily horoscope.
Sound like a trusted friend who happens to know the stars well.
Keep it under 80 words. Reference at least one real planetary position.
End with one reflective question. Never doom-and-gloom.
Use "you" — this is personal, not a newspaper column.

USER:
Name: {name}
Sun sign: {sun_sign}
Focus area: {focus_area}

Today's sky:
- Moon in {moon_sign} ({moon_phase})
- {major_transit_1}
- {major_transit_2}
- {retrograde_info}

Generate their daily horoscope and question.
```

### Daily Horoscope Prompt (premium tier)

```
SYSTEM:
[same as above, but add:]
You know this person. Use what you know about their life to make the 
reading specific. Keep it under 120 words.

USER:
Name: {name}
Sun sign: {sun_sign}, Moon sign: {moon_sign}, Rising: {rising_sign}
Focus area: {focus_area}

What I know about them:
{profile_notes}

Recent conversation:
{last_3_replies_summary}

Today's sky:
- Moon in {moon_sign} ({moon_phase})
- {major_transit_1}
- {major_transit_2}
- Transits to their chart: {personal_transits}

Generate their deeply personalized daily horoscope and question.
```

### Follow-up Reply Prompt

```
SYSTEM:
You are their personal astrologer. They just replied to today's horoscope.
Be warm, insightful, and connect their response to their chart.
Keep it under 100 words. Reference something astrological.
End warmly — they should feel heard.

USER:
Name: {name}
Chart summary: {natal_summary}
Today's transits: {transit_summary}
What I know about them: {profile_notes}
Today's horoscope question: {question}
Their reply: {reply_text}

Also extract ONE key insight about this person to remember (output as JSON field "insight").
```

---

## Open Questions Resolved

| Question | Decision |
|----------|----------|
| Email service | **Sweego** 🇫🇷 (EU, inbound webhooks, free tier) |
| Billing | **Creem** 🇪🇺 (EU MoR, 0% until €1K, handles VAT) |
| Astrology engine | **Kerykeion** (Python, self-hosted, free, Swiss Ephemeris) |
| LLM | Claude (Anthropic) — warm tone, good at persona |
| Hosting | This server (Docker Compose) |
| Freemium model | Hard paywall on replies (free gets daily email, no reply processing) |
| Pricing | €7.99/month or €59.99/year |
