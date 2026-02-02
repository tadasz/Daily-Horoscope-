import { Router } from 'express';
import config from '../config.js';
import { query } from '../db.js';

const router = Router();

const CREEM_API = config.creem.apiKey?.startsWith('creem_test')
  ? 'https://test-api.creem.io'
  : 'https://api.creem.io';

// POST /checkout — create a Creem checkout session for a user
router.post('/', async (req, res) => {
  try {
    const { token } = req.body; // unsub_token identifies the user

    if (!token) {
      return res.status(400).json({ error: 'Missing user token' });
    }

    const result = await query('SELECT * FROM users WHERE unsub_token = $1', [token]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    if (user.premium) {
      return res.json({ status: 'already_premium' });
    }

    const appUrl = config.appUrl.includes('localhost')
      ? 'https://gato.app'
      : config.appUrl;

    const checkoutRes = await fetch(`${CREEM_API}/v1/checkouts`, {
      method: 'POST',
      headers: {
        'x-api-key': config.creem.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id: config.creem.productId,
        success_url: `${appUrl}/checkout/success?token=${token}`,
        metadata: {
          user_id: String(user.id),
          unsub_token: token,
          email: user.email,
        },
      }),
    });

    if (!checkoutRes.ok) {
      const err = await checkoutRes.text();
      console.error('Creem checkout error:', err);
      return res.status(500).json({ error: 'Failed to create checkout' });
    }

    const checkout = await checkoutRes.json();
    console.log(`💳 Checkout created for ${user.name} (${user.email}): ${checkout.id}`);

    res.json({
      checkout_url: checkout.checkout_url,
      checkout_id: checkout.id,
    });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /checkout/success — handle redirect after successful payment
router.get('/success', async (req, res) => {
  const { token, checkout_id, customer_id, subscription_id } = req.query;

  if (token) {
    // Update user to premium (webhook will also do this, but belt & suspenders)
    try {
      await query(
        `UPDATE users SET premium = TRUE, premium_since = NOW(),
         creem_customer_id = COALESCE($2, creem_customer_id),
         creem_subscription_id = COALESCE($3, creem_subscription_id)
         WHERE unsub_token = $1`,
        [token, customer_id || null, subscription_id || null]
      );
      console.log(`⭐ User upgraded to premium via checkout redirect: ${token}`);
    } catch (e) {
      console.error('Error updating premium status:', e);
    }
  }

  // Redirect to a nice success page
  res.redirect(`/premium/welcome?token=${token || ''}`);
});

export default router;
