// src/controllers/joController.ts
import { Request, Response } from 'express';
import { verifyJobOrder } from '../services/joService';

export async function verifyJOHandler(req: Request, res: Response) {
  try {
    const { joNumber } = req.body;

    if (!joNumber || typeof joNumber !== 'string') {
      return res.status(400).json({ found: false, error: 'JO number is required.' });
    }

    const result = await verifyJobOrder(joNumber);
    res.json(result);

  } catch (err) {
    console.error('[JO] Controller error:', err);
    res.status(500).json({ found: false, error: 'Internal server error.' });
  }
}