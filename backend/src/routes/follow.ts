// src/routes/follow.ts (BACKEND)
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { followHandler, unfollowHandler, getFollowingHandler } from '../controllers/followController';

const router = Router();

router.get('/duty-requests/following',      authenticate, getFollowingHandler);
router.post('/duty-requests/:id/follow',    authenticate, followHandler);
router.delete('/duty-requests/:id/follow',  authenticate, unfollowHandler);

export default router;