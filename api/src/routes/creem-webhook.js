import { Router } from 'express';
import config from '../config.js';
import { query } from '../db.js';

const router = Router();

// POST /webhook/creem — handle Creem payment events
router.post('/', async (req, res) => {
  try {
    const event = req.body;
    console.log(`🔔 Creem webhook: ${event.eventType || event.event_type || 'unknown'}`, JSON.stringify(event).substring(0, 200));

    const eventType = event.eventType || event.event_type;
    const data = event.object || event.data || event;

    switch (eventType) {
      case 'checkout.completed': {
        // Payment successful — activate premium
        const email = data.customer?.email || data.customer_email;
        const customerId = data.customer?.id || data.customer_id;
        const subscriptionId = data.subscription_id;
        const metadata = data.metadata || {};

        let userResult;
        if (metadata.unsub_token) {
          userResult = await query('SELECT * FROM users WHERE unsub_token = $1', [metadata.unsub_token]);
        } else if (email) {
          userResult = await query('SELECT * FROM users WHERE email = $1', [email]);
        }

        if (userResult?.rows.length > 0) {
          await query(
            `UPDATE users SET premium = TRUE, premium_since = NOW(),
             creem_customer_id = COALESCE($2, creem_customer_id),
             creem_subscription_id = COALESCE($3, creem_subscription_id)
             WHERE id = $1`,
            [userResult.rows[0].id, customerId || null, subscriptionId || null]
          );
          console.log(`⭐ Premium activated via webhook: ${userResult.rows[0].name} (${email})`);
        } else {
          console.warn(`⚠️ Checkout completed but no user found for email: ${email}`);
        }
        break;
      }

      case 'subscription.canceled':
      case 'subscription.expired': {
        const subscriptionId = data.id || data.subscription_id;
        if (subscriptionId) {
          const result = await query(
            'UPDATE users SET premium = FALSE WHERE creem_subscription_id = $1 RETURNING name, email',
            [subscriptionId]
          );
          if (result.rows.length > 0) {
            console.log(`📉 Premium canceled: ${result.rows[0].name} (${result.rows[0].email})`);
          }
        }
        break;
      }

      case 'subscription.renewed':
      case 'subscription.active': {
        const subscriptionId = data.id || data.subscription_id;
        if (subscriptionId) {
          await query(
            'UPDATE users SET premium = TRUE WHERE creem_subscription_id = $1',
            [subscriptionId]
          );
          console.log(`🔄 Subscription renewed: ${subscriptionId}`);
        }
        break;
      }

      default:
        console.log(`ℹ️ Unhandled Creem event: ${eventType}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Creem webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
