import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const payload = JSON.stringify({
    transaction_id: `txn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sender_id: 'user_1',
    receiver_id: 'user_2',
    amount: 25.5,
    currency: 'INR',
  });

  const res = http.post('http://localhost:3001/v1/payments', payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'status is 200 or 201 or 409': (r) => r.status === 200 || r.status === 201 || r.status === 409,
  });

  sleep(1);
}
