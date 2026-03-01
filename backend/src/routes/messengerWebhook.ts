// src/routes/messengerWebhook.ts
import { Router, Request, Response } from 'express';
import { dutyRequestSchema } from '../models/dutyRequest';
import { pool } from '../config/db';

const router = Router();

// ✅ Use environment variable — never hardcode secrets
const VERIFY_TOKEN = process.env.MESSENGER_VERIFY_TOKEN;

router.get('/messenger-webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

router.post('/messenger-webhook', async (req: Request, res: Response) => {
  const body = req.body;

  if (body.object === 'page') {
    // ✅ Use Promise.all + map so async callbacks are properly awaited
    await Promise.all(
      body.entry.map(async (entry: any) => {
        const webhookEvent = entry.messaging[0];
        const messageText = webhookEvent.message?.text || '';

        // TODO: Replace placeholders with real Graph API data
        const dutyPayload = {
          name: 'User',
          department: 'IT',
          concern: messageText,
          localNum: '1234',
        };

        try {
          const parsed = dutyRequestSchema.parse(dutyPayload);
          await pool.query(
            'INSERT INTO duty_requests (data, status) VALUES ($1, $2)',
            [parsed, 'pending']
          );
        } catch (err) {
          console.error('Failed to insert duty from webhook:', err);
        }
      })
    );

    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

export default router;