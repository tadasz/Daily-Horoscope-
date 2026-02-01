/**
 * Email service — sends emails via Sweego (EU).
 * https://www.sweego.io/send-email-sms-api-smtp
 */
import config from '../config.js';

const SWEEGO_API = 'https://api.sweego.io';

async function sweegoSend(body) {
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


export async function sendHoroscopeEmail(user, { subject, horoscope, nudge, question, lucky_number }, transitSummary = '') {
  const unsubUrl = `${config.appUrl}/unsubscribe/${user.unsub_token}`;

  const techBlock = transitSummary ? `
      <div style="background: #f8f6fc; border-radius: 8px; padding: 16px 20px; margin: 24px 0; border-left: 3px solid #6b4c9a;">
        <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #6b4c9a; margin: 0 0 8px; font-weight: 600;">Today's Sky</p>
        <pre style="font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px; line-height: 1.7; color: #555; margin: 0; white-space: pre-wrap;">${transitSummary.replace(/\n/g, '<br>')}</pre>
      </div>` : '';
  
  const htmlBody = `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 520px; margin: 0 auto; padding: 20px; color: #2d2d2d;">
      <p style="font-size: 17px; line-height: 1.7; margin-bottom: 20px;">
        ${horoscope.replace(/\n/g, '<br>')}
      </p>
      ${lucky_number ? `<p style="font-size: 15px; color: #6b4c9a; margin: 20px 0;">🔢 Today's number: <strong>${lucky_number}</strong></p>` : ''}
      <p style="font-size: 16px; line-height: 1.7; color: #4a3570; margin: 24px 0 0;">
        ${nudge || question || ''}
      </p>
      ${techBlock}
      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
      <p style="font-size: 12px; color: #aaa; text-align: center;">
        <a href="${unsubUrl}" style="color: #aaa;">Unsubscribe</a>
      </p>
    </div>
  `;

  const result = await sweegoSend({
    channel: 'email',
    provider: 'sweego',
    recipients: [{ email: user.email, name: user.name }],
    from: { email: config.sweego.fromEmail, name: config.sweego.fromName },
    subject: subject,
    'message-html': htmlBody,
    'message-txt': `${horoscope}\n\n${question}\n\nJust hit reply — I'm here.\n\nUnsubscribe: ${unsubUrl}`,
    'campaign-type': 'market',
    'dry-run': false,
  });

  return result;
}


export async function sendFollowupEmail(user, followupText) {
  const unsubUrl = `${config.appUrl}/unsubscribe/${user.unsub_token}`;
  
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
  });
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
  });
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


export async function sendRichWelcomeEmail(user, { subject, reading, technical_section }) {
  const unsubUrl = `${config.appUrl}/unsubscribe/${user.unsub_token}`;

  const readingHtml = mdToHtml(reading);
  const techHtml = technical_section
    .replace(/℞/g, '<span style="color: #c0392b;">℞</span>')
    .replace(/\n/g, '<br>');

  const htmlBody = `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 560px; margin: 0 auto; padding: 30px 20px; color: #2d2d2d;">
      
      <p style="font-size: 17px; line-height: 1.7; margin-bottom: 16px;">
        ${readingHtml}
      </p>

      <div style="background: #f8f6fc; border-radius: 8px; padding: 20px 24px; margin: 30px 0; border-left: 3px solid #6b4c9a;">
        <p style="font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; color: #6b4c9a; margin: 0 0 12px; font-weight: 600;">
          Your Chart Data
        </p>
        <pre style="font-family: 'SF Mono', 'Fira Code', monospace; font-size: 13px; line-height: 1.8; color: #444; margin: 0; white-space: pre-wrap;">${techHtml}</pre>
      </div>

      <p style="font-size: 15px; color: #888; margin-top: 30px; text-align: center;">
        <em>Tomorrow morning, your first daily reading arrives. ☽</em>
      </p>

      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
      <p style="font-size: 12px; color: #aaa; text-align: center;">
        <a href="${unsubUrl}" style="color: #aaa;">Unsubscribe</a>
      </p>
    </div>
  `;

  const plainText = reading + '\n\n---\n\n' + technical_section + '\n\nUnsubscribe: ' + unsubUrl;

  return sweegoSend({
    channel: 'email',
    provider: 'sweego',
    recipients: [{ email: user.email, name: user.name }],
    from: { email: config.sweego.fromEmail, name: config.sweego.fromName },
    subject: subject,
    'message-html': htmlBody,
    'message-txt': plainText,
    'campaign-type': 'transac',
  });
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
  });
}
