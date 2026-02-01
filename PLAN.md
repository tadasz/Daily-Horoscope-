# AI Personalized Horoscope — Technical Plan

## The Product (dead simple)

1. **Landing page** — answer 5-6 questions, enter email, subscribe
2. **Daily email** — short personalized horoscope grounded in real astrology
3. **Question at the end** — open-ended, invites reply
4. **User replies to email** — we process it, remember it, send a follow-up
5. **Over time** — horoscopes get more personal as we learn about them

---

## User Flow

```
LANDING PAGE
  → Birth date, time (optional), place
  → "What's on your mind lately?" (free text)
  → "What area of life matters most right now?" (love / career / health / growth / money)
  → Email address
  → Subscribe
  
DAILY EMAIL (every morning, ~8 AM their timezone)
  → 3-5 sentences grounded in real astrology
  → References their sign, current transits, moon phase
  → Weaves in what we know about them
  → Ends with an open-ended question
  
USER REPLIES TO EMAIL
  → Inbound email is parsed
  → AI generates a short, warm follow-up reply
  → Their answer is stored in their profile
  → Tomorrow's horoscope uses this context
```

---

## The Daily Email — Example

**Subject:** ☽ Moon in Pisces today — trust the quiet voice, [Name]

> With the Moon moving through Pisces today and squaring your natal Mercury, 
> your mind might feel foggy — but that's not confusion, it's intuition trying 
> to speak louder than logic. 
>
> Given that you've been weighing that career decision, today isn't the day to 
> force an answer. Let it simmer. Mars enters your 6th house tomorrow — clarity 
> comes with action, not overthinking.
>
> **✨ A question for you:** What's one thing you've been avoiding thinking about?
>
> *Just hit reply — I'm here.*

**Key principles:**
- Short (under 100 words for the horoscope part)
- Real astrology language (Moon in Pisces, squares Mercury, Mars in 6th house)
- References something personal (the career decision they mentioned)
- Ends with a question that prompts self-reflection
- "Just hit reply" — friction-free interaction

---

## Technical Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ Landing Page │────→│  Backend API  │────→│ PostgreSQL  │
│  (static)    │     │  (Node.js)   │     │             │
└─────────────┘     └──────┬───────┘     └─────────────┘
                           │                     ↑
                    ┌──────┴───────┐              │
                    │  Daily Cron   │──────────────┘
                    │  (generate +  │
                    │   send emails)│
                    └──────┬───────┘
                           │
                    ┌──────┴───────┐
                    │   Resend     │ ← sends emails
                    │   (email)    │ ← receives replies (webhook)
                    └──────────────┘
                           │
                    ┌──────┴───────┐
                    │   LLM API    │ ← generates horoscopes
                    │  (Claude /   │ ← generates follow-ups
                    │   OpenAI)    │
                    └──────────────┘
```

### Components

**1. Landing Page (static HTML)**
- Host on Vercel/Netlify (free) or same VPS
- Simple form → POST to backend API
- Fields:
  - Name (first name)
  - Email
  - Birth date (required)
  - Birth time (optional — "Don't know" option)
  - Birth city (for timezone + chart accuracy)
  - "What's on your mind right now?" (textarea)
  - "Focus area" (radio: love / career / health / growth / money)
- Clean, mystical-but-modern design (dark theme, stars, minimal)

**2. Backend API (Node.js + Express)**

Endpoints:
```
POST /subscribe        — new user signup
POST /webhook/email    — inbound email reply (Resend webhook)
GET  /unsubscribe/:id  — unsubscribe link
```

**3. Database (PostgreSQL)**

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  name          TEXT,
  birth_date    DATE NOT NULL,
  birth_time    TIME,              -- nullable (user may not know)
  birth_city    TEXT,
  birth_lat     DECIMAL,
  birth_lng     DECIMAL,
  timezone      TEXT,              -- derived from birth_city
  sun_sign      TEXT,              -- calculated on signup
  moon_sign     TEXT,              -- calculated if birth_time known
  rising_sign   TEXT,              -- calculated if birth_time known
  focus_area    TEXT,              -- love/career/health/growth/money
  profile_notes TEXT,              -- AI-curated summary of what we know
  raw_context   JSONB DEFAULT '[]', -- array of things learned from replies
  subscribed    BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE emails_sent (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id),
  sent_at       TIMESTAMPTZ DEFAULT NOW(),
  subject       TEXT,
  body          TEXT,
  question      TEXT,              -- the question we asked
  transit_data  JSONB,             -- planetary data used
  opened        BOOLEAN DEFAULT FALSE
);

CREATE TABLE replies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id),
  email_id      UUID REFERENCES emails_sent(id),
  reply_text    TEXT,
  ai_followup   TEXT,              -- our AI response
  received_at   TIMESTAMPTZ DEFAULT NOW()
);
```

**4. Astrology Engine**

Use **astronomia** (npm) or call **Swiss Ephemeris** via a small wrapper to get:
- Current planetary positions (which sign each planet is in)
- Moon phase + moon sign (changes every ~2.5 days)
- Key aspects today (conjunctions, squares, oppositions)
- User's natal chart positions (calculated once on signup)
- Current transits to their natal chart (what's "active" for THEM today)

For MVP, we can simplify:
- **Always include:** today's Moon sign + phase (this changes daily, sounds legit)
- **Calculate:** user's sun sign (from birth date, trivial)
- **If birth time known:** moon sign, rising sign, house positions
- **Transits:** which current planets aspect their natal planets

Library options:
- `astronomia` (npm) — JS astronomical calculations
- Swiss Ephemeris Node wrapper
- Or even: pre-calculated daily transit data from a free API

**5. Daily Horoscope Generation (Cron — 6 AM UTC)**

For each subscribed user:

```
INPUT to LLM:
  - System prompt (personality, astrology expertise, tone)
  - User profile (sign, birth data, focus area)
  - What we know about them (profile_notes + recent replies)
  - Today's planetary data (moon sign, major transits, aspects to their chart)
  - Their recent emails + replies (last 3)

OUTPUT from LLM:
  - Horoscope text (3-5 sentences, under 100 words)
  - Subject line (includes a real astro reference)
  - Question for them (open-ended, reflective)
```

**System prompt (draft):**
```
You are a warm, wise astrologer who writes personalized daily horoscopes. 
You sound knowledgeable but not preachy — like a trusted friend who happens 
to know the stars. 

Rules:
- Keep it under 100 words
- Always reference at least one real planetary position or transit
- If you know personal context about the user, weave it in naturally
- End with one open-ended reflective question
- Never be doom-and-gloom — even hard transits have growth angles
- Use "you" not "Aries" — this is personal
- Sound like a human, not a horoscope column
```

**6. Inbound Email Processing (Resend webhook)**

When user replies to the daily email:
1. Webhook fires → our API receives the reply text
2. Match to user by sender email
3. Store reply in `replies` table
4. Send reply + user profile to LLM → generate a short, warm follow-up
5. Send follow-up reply via Resend
6. Update `users.raw_context` with key takeaway from their reply
7. Periodically: LLM summarizes raw_context into `profile_notes` (curated memory)

**Follow-up example:**
> That makes total sense — the fact that you're feeling torn about staying 
> vs. leaving tells me a lot. With Saturn transiting your 7th house this year, 
> these relationship questions aren't random — they're right on schedule 
> cosmically. More on this tomorrow. ✨

---

## Email Service — Resend

**Why Resend:**
- Free tier: 3,000 emails/month (100/day)
- Inbound email processing (webhook for replies) ✅
- Simple API, great developer experience
- Custom domain support (send from hello@yourdomain.com)

**For MVP (under 100 users):** free tier is plenty
**At scale:** $20/month for 50k emails

**Inbound webhook setup:**
- Configure MX records for your domain
- Resend forwards incoming emails to your webhook URL
- Parse sender, subject, body → match to user → process

---

## Cost Per User

| Component | Cost/user/month |
|-----------|----------------|
| LLM (daily horoscope) | ~$0.01-0.03 |
| LLM (reply follow-ups, ~10/month) | ~$0.02-0.05 |
| Email sending (30 emails) | ~$0.003 |
| Hosting (amortized) | ~$0.05 |
| **Total** | **~$0.08-0.13** |

Even at $5/month subscription → **97%+ gross margin**

---

## Build Plan (weekends, ~2 weeks)

### Week 1: Core

**Day 1-2: Setup + Database**
- Set up project (Node.js, Express, PostgreSQL)
- Database schema
- Resend account + domain verification
- Basic astrology calculations (sun sign from date, moon sign lookup)

**Day 3-4: Landing Page + Signup**
- Static HTML/CSS landing page
- Form → API → store user in DB
- Calculate natal data on signup
- Send welcome email

**Day 5: Daily Horoscope Generator**
- Cron job
- Fetch today's planetary positions
- For each user: build LLM prompt → generate horoscope → send email
- Test with yourself

### Week 2: Replies + Polish

**Day 6-7: Inbound Email Processing**
- Resend inbound webhook
- Parse reply → match user → store
- LLM follow-up generation → send reply
- Update user profile with new context

**Day 8: Memory System**
- After every few replies: summarize what we know into profile_notes
- Feed profile_notes into daily horoscope prompt
- Test the "getting more personal" loop

**Day 9-10: Polish + Launch**
- Landing page design polish
- Email template styling
- Unsubscribe flow
- Error handling
- Deploy to VPS (Hetzner/Railway)
- Test full flow end-to-end
- Share with friends for beta

---

## Domain / Naming Ideas

*To discuss:*
- yourcosmicfriend.com
- starwhisper.app
- dailyalign.com
- celestialself.com
- starsknow.me

---

## Open Questions

1. **Name + domain?**
2. **What email to send FROM?** (e.g., stars@yourdomain.com)
3. **Timezone handling** — send at 8 AM user's local time? Or fixed UTC time?
4. **Birth time unknown** — how much does this limit us? (No moon/rising sign, less accurate houses)
5. **Premium from day 1 or free-only MVP?** (Recommend: 100% free for beta, add paywall later)
6. **Design vibe?** Dark/mystical? Light/modern? Minimal?
