import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const TPS = Number(__ENV.TPS || 250);
const DURATION = __ENV.DURATION || '60s';

const acceptedPayments = new Counter('payments_accepted');
const rejectedPayments = new Counter('payments_rejected');

export const options = {
  scenarios: {
    payment_load: {
      executor: 'constant-arrival-rate',
      rate: TPS,
      timeUnit: '1s',
      duration: DURATION,
      preAllocatedVUs: 100,
      maxVUs: 500,
      startTime: '0s',
    },
  },

  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
    dropped_iterations: ['count==0'],
  },

  summaryTrendStats: [
    'avg',
    'min',
    'med',
    'max',
    'p(90)',
    'p(95)',
    'p(99)',
  ],
};

function generateTransactionId() {
  return `loadtest-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 10)}`;
}

export default function () {
  const transactionId = generateTransactionId();

  const payload = JSON.stringify({
    transaction_id: transactionId,
    sender_id: 'user_001',
    receiver_id: 'user_002',
    amount: 25.5,
    currency: 'INR',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    timeout: '10s',
    tags: {
      endpoint: 'POST /v1/payments',
    },
  };

  const res = http.post(
    `${BASE_URL}/v1/payments`,
    payload,
    params
  );

  const success = check(res, {
    'payment accepted (202)': (r) => r.status === 202,

    'transactionId returned': (r) => {
      try {
        const body = r.json();
        return body.transactionId === transactionId;
      } catch (e) {
        return false;
      }
    },

    'status is PENDING': (r) => {
      try {
        const body = r.json();
        return body.status === 'PENDING';
      } catch (e) {
        return false;
      }
    },
  });

  if (res.status === 202 && success) {
    acceptedPayments.add(1);
  } else {
    rejectedPayments.add(1);

    console.log(
      `Payment failed | status=${res.status} | transaction=${transactionId} | body=${res.body}`
    );
  }
}

export function handleSummary(data) {
  const metrics = data.metrics;

  const duration = metrics.http_req_duration;
  const requests = metrics.http_reqs;
  const failures = metrics.http_req_failed;
  const dropped = metrics.dropped_iterations;

  const summary = {
    test: {
      name: 'SwiftPay Payment Gateway - 250 TPS Load Test',
      target_tps: TPS,
      duration: DURATION,
      endpoint: 'POST /v1/payments',
      base_url: BASE_URL,
    },

    results: {
      total_requests: requests
        ? requests.values.count
        : 0,

      achieved_requests_per_second: requests
        ? requests.values.rate
        : 0,

      http_failure_rate: failures
        ? failures.values.rate
        : 0,

      dropped_iterations: dropped
        ? dropped.values.count
        : 0,

      latency_ms: duration
        ? {
            min: duration.values.min,
            avg: duration.values.avg,
            median: duration.values.med,
            p90: duration.values['p(90)'],
            p95: duration.values['p(95)'],
            p99: duration.values['p(99)'],
            max: duration.values.max,
          }
        : {},
    },

    acceptance_criteria: {
      target_tps: TPS,
      p95_latency_target_ms: 500,
      max_http_failure_rate: 0.01,
      max_dropped_iterations: 0,
    },
  };

  return {
    stdout: JSON.stringify(summary, null, 2),
    'results/250-tps-summary.json': JSON.stringify(summary, null, 2),
  };
}