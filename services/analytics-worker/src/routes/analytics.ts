import { Router } from 'express';
import { analyticsRepository } from '../repositories/analyticsRepository';

const router = Router();

router.get('/v1/analytics/volume', async (req, res) => {
  const from = typeof req.query.from === 'string' ? req.query.from : undefined;
  const to = typeof req.query.to === 'string' ? req.query.to : undefined;

  const result = await analyticsRepository.getVolume({ from, to });
  res.status(200).json({
    service: 'analytics-worker',
    timestamp: new Date().toISOString(),
    ...result,
  });
});

export default router;
