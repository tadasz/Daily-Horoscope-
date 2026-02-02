/**
 * Email service — sends emails via Sweego (EU).
 * https://www.sweego.io/send-email-sms-api-smtp
 */
import config from '../config.js';

const SWEEGO_API = 'https://api.sweego.io';

async function sweegoSend(body, meta = {}) {
  // Inject campaign-tags and metadata headers for tracking
  if (meta.emailType) {
    body['campaign-tags'] = [meta.emailType, meta.language || 'en'];
  }
  body.headers = {
    ...body.headers,
    'metadata-user-id': meta.userId || '',
    'metadata-email-type': meta.emailType || '',
    'metadata-language': meta.language || 'en',
  };

  // If no API key configured, log the email instead of sending
  if (!config.sweego.apiKey) {
    console.log(`📧 [DRY RUN] Would send email to ${body.recipients?.[0]?.email}:`);
    console.log(`   Subject: ${body.subject}`);
    console.log(`   Body: ${(body['message-txt'] || '').substring(0, 100)}...`);
    return { id: 'dry-run-' + Date.now(), status: 'dry_run' };
  }

  const res = await fetch(`${SWEEGO_API}/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Api-Key': config.sweego.apiKey,
    },
    body: JSON.stringify(body),
  });
  
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sweego error ${res.status}: ${err}`);
  }
  
  return res.json();
}


export async function sendHoroscopeEmail(user, { subject, horoscope, preheader }, transitSummary = '', numerology = null) {
  const unsubUrl = `${config.appUrl}/unsubscribe/${user.unsub_token}`;
  const feedbackUrl = `${config.appUrl}/feedback/${user.unsub_token}`;
  const settingsUrl = `${config.appUrl}/settings/${user.unsub_token}`;
  const isLithuanian = user.language === 'lt';

  const todaysNumbers = isLithuanian ? 'Dienos skaičiai' : 'Today\'s Numbers';
  const personalDay = isLithuanian ? 'Tavo dienos skaičius' : 'Your personal day';
  const universalEnergy = isLithuanian ? 'Visuotinė energija' : 'Universal energy';
  const questionsText = isLithuanian 
    ? 'Turite klausimų? Tiesiog atsakykite į šį laišką.'
    : 'Questions? Want to dive deeper? Just reply to this email.';
  const unsubText = isLithuanian ? 'Atsisakyti prenumeratos' : 'Unsubscribe';
  const settingsText = isLithuanian ? 'Nustatymai' : 'Settings';
  const feedbackText = isLithuanian ? 'Atsiliepimai' : 'Feedback';

  const techBlock = transitSummary ? `
      <div style="background: #f8f6fc; border-radius: 8px; padding: 16px 20px; margin: 24px 0; border-left: 3px solid #6b4c9a;">
        <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #6b4c9a; margin: 0 0 8px; font-weight: 600;">Today's Sky</p>
        <pre style="font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px; line-height: 1.7; color: #555; margin: 0; white-space: pre-wrap;">${transitSummary.replace(/\n/g, '<br>')}</pre>
      </div>` : '';
  
  const preheaderHtml = preheader ? `<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>` : '';

  const htmlBody = `
    ${preheaderHtml}
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 520px; margin: 0 auto; padding: 20px; color: #2d2d2d;">
      <p style="font-size: 17px; line-height: 1.7; margin-bottom: 20px;">
        ${horoscope.replace(/\n/g, '<br>')}
      </p>
      ${numerology ? `
      <div style="background: #f8f6fc; border-radius: 8px; padding: 14px 18px; margin: 24px 0;">
        <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #6b4c9a; margin: 0 0 6px; font-weight: 600;">${todaysNumbers}</p>
        <span style="font-size: 14px; color: #444; line-height: 1.6;">
          🔢 ${personalDay}: <strong>${numerology.personalDay}</strong> <span style="color: #888; font-size: 12px;">— ${numerology.personalDayMeaning || ''}</span><br>
          🌐 ${universalEnergy}: <strong>${numerology.universalDay}</strong> <span style="color: #888; font-size: 12px;">— ${numerology.universalDayMeaning || ''}</span>
        </span>
      </div>` : ''}
      <p style="font-size: 15px; color: #888; margin-top: 24px;">
        <em>${questionsText}</em>
      </p>
      ${techBlock}
      ${!user.premium ? `
      <div style="text-align: center; margin: 28px 0 8px; padding: 16px; background: #f9f5ff; border-radius: 10px;">
        <p style="font-size: 14px; color: #6d28d9; margin: 0;">
          ✨ ${isLithuanian 
            ? '<a href="' + config.appUrl + '/quiz?lang=lt" style="color: #6d28d9; font-weight: 600;">Pasirink Premium</a> — savaitiniai giluminiai skaitymai, asmeninis stilius ir daugiau. €7.99/mėn.'
            : '<a href="' + config.appUrl + '/quiz?lang=en" style="color: #6d28d9; font-weight: 600;">Go Premium</a> — weekly deep dives, your custom style & more. €7.99/mo.'}
        </p>
      </div>` : ''}
      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
      <p style="font-size: 12px; color: #aaa; text-align: center;">
        <a href="${feedbackUrl}" style="color: #aaa;">${feedbackText}</a> | <a href="${settingsUrl}" style="color: #aaa;">${settingsText}</a> | <a href="${unsubUrl}" style="color: #aaa;">${unsubText}</a>
      </p>
    </div>
  `;

  const plainUnsubText = isLithuanian ? 'Atsisakyti prenumeratos' : 'Unsubscribe';
  const plainQuestionsText = isLithuanian 
    ? 'Turite klausimų? Tiesiog atsakykite į šį laišką.'
    : 'Questions? Want to dive deeper? Just reply to this email.';
  const personalDayPlain = isLithuanian ? 'Tavo diena' : 'Your day';
  const universalPlain = isLithuanian ? 'Visuotinė' : 'Universal';

  const result = await sweegoSend({
    channel: 'email',
    provider: 'sweego',
    recipients: [{ email: user.email, name: user.name }],
    from: { email: config.sweego.fromEmail, name: config.sweego.fromName },
    subject: subject,
    'message-html': htmlBody,
    'message-txt': `${horoscope}\n\n${numerology ? `${personalDayPlain}: ${numerology.personalDay} · ${universalPlain}: ${numerology.universalDay}\n\n` : ''}${plainQuestionsText}\n\n${settingsText}: ${settingsUrl}\n${plainUnsubText}: ${unsubUrl}`,
    'campaign-type': 'transac',
    headers: { 'Reply-To': config.sweego.replyEmail },
    'dry-run': false,
  }, { emailType: 'daily', language: user.language || 'en', userId: user.id || user.unsub_token });

  return result;
}


export async function sendFollowupEmail(user, followupText) {
  const unsubUrl = `${config.appUrl}/unsubscribe/${user.unsub_token}`;
  const feedbackUrl = `${config.appUrl}/feedback/${user.unsub_token}`;
  
  const htmlBody = `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 520px; margin: 0 auto; padding: 20px; color: #2d2d2d;">
      <p style="font-size: 17px; line-height: 1.7;">
        ${followupText.replace(/\n/g, '<br>')}
      </p>
      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
      <p style="font-size: 12px; color: #aaa; text-align: center;">
        <a href="${unsubUrl}" style="color: #aaa;">Unsubscribe</a>
      </p>
    </div>
  `;

  return sweegoSend({
    channel: 'email',
    provider: 'sweego',
    recipients: [{ email: user.email, name: user.name }],
    from: { email: config.sweego.fromEmail, name: config.sweego.fromName },
    subject: `Re: Your cosmic reading ✨`,
    'message-html': htmlBody,
    'message-txt': followupText,
    'campaign-type': 'transac',
    headers: { 'Reply-To': config.sweego.replyEmail },
  }, { emailType: 'followup', language: user.language || 'en', userId: user.id });
}


export async function sendPaywallReply(user) {
  const htmlBody = `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 520px; margin: 0 auto; padding: 20px; color: #2d2d2d;">
      <p style="font-size: 17px; line-height: 1.7;">
        I'd love to hear more about what's going on in your life — and weave it into your readings.
      </p>
      <p style="font-size: 17px; line-height: 1.7;">
        With Premium, I actually read and remember everything you tell me. Your horoscopes become 
        deeply personal — referencing your real life, your decisions, your patterns.
      </p>
      <p style="font-size: 17px; line-height: 1.7;">
        <a href="${config.appUrl}/premium" style="color: #6b4c9a; font-weight: bold;">✨ Unlock Premium →</a>
      </p>
      <p style="font-size: 15px; color: #888; margin-top: 20px;">
        <em>Your stars are waiting to get personal.</em>
      </p>
    </div>
  `;

  return sweegoSend({
    channel: 'email',
    provider: 'sweego',
    recipients: [{ email: user.email, name: user.name }],
    from: { email: config.sweego.fromEmail, name: config.sweego.fromName },
    subject: `✨ Let me get to know you better`,
    'message-html': htmlBody,
    'message-txt': 'With Premium, I actually read and remember everything you tell me. Your horoscopes become deeply personal.',
    'campaign-type': 'transac',
    headers: { 'Reply-To': config.sweego.replyEmail },
  }, { emailType: 'paywall', language: user.language || 'en', userId: user.id });
}


function mdToHtml(md) {
  return md
    .replace(/### (.+)/g, '<h3 style="font-size: 18px; color: #6b4c9a; margin: 28px 0 12px; font-weight: 600;">$1</h3>')
    .replace(/## (.+)/g, '<h2 style="font-size: 22px; color: #4a3570; margin: 0 0 20px; font-weight: 400; letter-spacing: 0.5px;">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p style="font-size: 17px; line-height: 1.7; margin-bottom: 16px;">')
    .replace(/\n/g, '<br>');
}


export async function sendRichWelcomeEmail(user, { subject, preheader, reading, technical_section, numerology }) {
  const unsubUrl = `${config.appUrl}/unsubscribe/${user.unsub_token}`;
  const feedbackUrl = `${config.appUrl}/feedback/${user.unsub_token}`;
  const settingsUrl = `${config.appUrl}/settings/${user.unsub_token}`;
  const isLithuanian = user.language === 'lt';

  const readingHtml = mdToHtml(reading);
  const techHtml = technical_section
    .replace(/℞/g, '<span style="color: #c0392b;">℞</span>')
    .replace(/\n/g, '<br>');

  const M = numerology?.meanings || {};
  const numbersTitle = isLithuanian ? 'Tavo skaičiai' : 'Your Numbers';
  const lifePathLabel = isLithuanian ? 'Gyvenimo kelias' : 'Life Path';
  const birthdayLabel = isLithuanian ? 'Gimtadienis' : 'Birthday';
  const expressionLabel = isLithuanian ? 'Išraiška' : 'Expression';
  const soulUrgeLabel = isLithuanian ? 'Sielos poreikis' : 'Soul Urge';
  const yearLabel = isLithuanian ? 'Tavo 2026' : 'Your 2026';
  const chartDataTitle = isLithuanian ? 'Tavo horoskopu duomenys' : 'Your Chart Data';
  const tomorrowText = isLithuanian 
    ? 'Rytoj ryte atvyks tavo pirmasis kasdieninis skaitymas. ☽'
    : 'Tomorrow morning, your first daily reading arrives. ☽';
  const unsubText = isLithuanian ? 'Atsisakyti prenumeratos' : 'Unsubscribe';
  const settingsText = isLithuanian ? 'Nustatymai' : 'Settings';
  const feedbackText = isLithuanian ? 'Atsiliepimai' : 'Feedback';

  const numIntro = isLithuanian
    ? 'Numerologija apskaičiuoja tavo asmeninius skaičius pagal gimimo datą ir vardą. Kiekvienas skaičius atskleidžia skirtingą tavo asmenybės ir likimo aspektą.'
    : 'Numerology calculates your personal numbers from your birth date and name. Each number reveals a different aspect of your personality and path.';

  const numExplanations = isLithuanian ? {
    lifePath: 'Tavo pagrindinis gyvenimo tikslas ir misija',
    birthday: 'Tavo įgimtas talentas — dovana, su kuria gimei',
    expression: 'Kaip tu reiškiesi pasaulyje ir ką kuri',
    soulUrge: 'Ko tavo siela iš tikrųjų trokšta giliai viduje',
    personalYear: 'Šių metų pagrindinė energija ir tema',
  } : {
    lifePath: 'Your core life purpose and mission',
    birthday: 'Your innate talent — the gift you were born with',
    expression: 'How you express yourself in the world',
    soulUrge: 'What your soul truly desires deep down',
    personalYear: 'This year\'s overarching energy and theme',
  };

  const numBlock = numerology ? `
      <div style="background: #fdf6f0; border-radius: 8px; padding: 20px 24px; margin: 30px 0; border-left: 3px solid #c9873a;">
        <p style="font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; color: #c9873a; margin: 0 0 10px; font-weight: 600;">
          ${numbersTitle}
        </p>
        <p style="font-size: 14px; color: #777; margin: 0 0 16px; line-height: 1.5; font-style: italic;">
          ${numIntro}
        </p>
        <table style="font-family: Georgia, serif; font-size: 15px; color: #444; border-collapse: collapse; width: 100%;">
          <tr>
            <td style="padding: 6px 12px 6px 0; white-space: nowrap; vertical-align: top;">🔢 ${lifePathLabel}</td>
            <td style="padding: 6px 0;"><strong>${numerology.lifePath}</strong> — ${M[numerology.lifePath] || ''}<br><span style="color: #999; font-size: 12px;">${numExplanations.lifePath}</span></td>
          </tr>
          <tr>
            <td style="padding: 6px 12px 6px 0; white-space: nowrap; vertical-align: top;">🎂 ${birthdayLabel}</td>
            <td style="padding: 6px 0;"><strong>${numerology.birthday}</strong> — ${M[numerology.birthday] || ''}<br><span style="color: #999; font-size: 12px;">${numExplanations.birthday}</span></td>
          </tr>
          <tr>
            <td style="padding: 6px 12px 6px 0; white-space: nowrap; vertical-align: top;">✨ ${expressionLabel}</td>
            <td style="padding: 6px 0;"><strong>${numerology.expression}</strong> — ${M[numerology.expression] || ''}<br><span style="color: #999; font-size: 12px;">${numExplanations.expression}</span></td>
          </tr>
          <tr>
            <td style="padding: 6px 12px 6px 0; white-space: nowrap; vertical-align: top;">💜 ${soulUrgeLabel}</td>
            <td style="padding: 6px 0;"><strong>${numerology.soulUrge}</strong> — ${M[numerology.soulUrge] || ''}<br><span style="color: #999; font-size: 12px;">${numExplanations.soulUrge}</span></td>
          </tr>
          ${numerology.personalYear != null ? `<tr style="border-top: 1px solid #e8d5c4;">
            <td style="padding: 10px 12px 6px 0; white-space: nowrap; vertical-align: top;">📅 ${yearLabel}</td>
            <td style="padding: 10px 0 6px;"><strong>${numerology.personalYear}</strong> — ${M[numerology.personalYear] || ''}<br><span style="color: #999; font-size: 12px;">${numExplanations.personalYear}</span></td>
          </tr>` : ''}
        </table>
      </div>` : '';

  const preheaderHtml2 = preheader ? `<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>` : '';

  const htmlBody = `
    ${preheaderHtml2}
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 560px; margin: 0 auto; padding: 30px 20px; color: #2d2d2d;">
      
      <p style="font-size: 17px; line-height: 1.7; margin-bottom: 16px;">
        ${readingHtml}
      </p>

      ${numBlock}

      <div style="background: #f8f6fc; border-radius: 8px; padding: 20px 24px; margin: 30px 0; border-left: 3px solid #6b4c9a;">
        <p style="font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; color: #6b4c9a; margin: 0 0 12px; font-weight: 600;">
          ${chartDataTitle}
        </p>
        <pre style="font-family: 'SF Mono', 'Fira Code', monospace; font-size: 13px; line-height: 1.8; color: #444; margin: 0; white-space: pre-wrap;">${techHtml}</pre>
      </div>

      <p style="font-size: 15px; color: #888; margin-top: 30px; text-align: center;">
        <em>${tomorrowText}</em>
      </p>

      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
      <p style="font-size: 12px; color: #aaa; text-align: center;">
        <a href="${feedbackUrl}" style="color: #aaa;">${feedbackText}</a> | <a href="${settingsUrl}" style="color: #aaa;">${settingsText}</a> | <a href="${unsubUrl}" style="color: #aaa;">${unsubText}</a>
      </p>
    </div>
  `;

  const plainUnsubText = isLithuanian ? 'Atsisakyti prenumeratos' : 'Unsubscribe';
  const plainSettingsText = isLithuanian ? 'Nustatymai' : 'Settings';
  const plainText = reading + '\n\n---\n\n' + technical_section + `\n\n${plainSettingsText}: ${settingsUrl}\n${plainUnsubText}: ${unsubUrl}`;

  return sweegoSend({
    channel: 'email',
    provider: 'sweego',
    recipients: [{ email: user.email, name: user.name }],
    from: { email: config.sweego.fromEmail, name: config.sweego.fromName },
    subject: subject,
    'message-html': htmlBody,
    'message-txt': plainText,
    'campaign-type': 'transac',
    headers: { 'Reply-To': config.sweego.replyEmail },
  }, { emailType: 'welcome', language: user.language || 'en', userId: user.id || user.unsub_token });
}


export async function sendWelcomeEmail(user) {
  const htmlBody = `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 520px; margin: 0 auto; padding: 20px; color: #2d2d2d;">
      <p style="font-size: 17px; line-height: 1.7;">
        Welcome, ${user.name} ✨
      </p>
      <p style="font-size: 17px; line-height: 1.7;">
        I've looked at your chart — ${user.sun_sign} Sun${user.moon_sign ? ', ' + user.moon_sign + ' Moon' : ''}${user.rising_sign ? ', ' + user.rising_sign + ' Rising' : ''}. 
        There's a lot to explore here.
      </p>
      <p style="font-size: 17px; line-height: 1.7;">
        Starting tomorrow morning, you'll receive a personalized cosmic reading in your inbox. 
        It's grounded in real planetary positions — not generic fluff.
      </p>
      <p style="font-size: 17px; line-height: 1.7;">
        See you under the stars. ☽
      </p>
    </div>
  `;

  return sweegoSend({
    channel: 'email',
    provider: 'sweego',
    recipients: [{ email: user.email, name: user.name }],
    from: { email: config.sweego.fromEmail, name: config.sweego.fromName },
    subject: `☽ Welcome, ${user.name} — your chart is ready`,
    'message-html': htmlBody,
    'message-txt': `Welcome, ${user.name}! I've looked at your chart — ${user.sun_sign} Sun. Starting tomorrow morning, you'll receive a personalized cosmic reading. See you under the stars. ☽`,
    'campaign-type': 'transac',
    headers: { 'Reply-To': config.sweego.replyEmail },
  }, { emailType: 'welcome-simple', language: 'en', userId: user.id });
}
