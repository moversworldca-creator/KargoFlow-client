import { it, expect } from 'vitest';
import { recordWorkError } from './recordWorkError';
it.each([400, 401, 403, 404, 409, 500])('reports HTTP %s errors with an actionable message', status => {
  const message = recordWorkError({ response: { status, data: { quantity: ['Quantity must be positive.'] } } });
  expect(message).toBeTruthy();
  if (status === 400) expect(message).toBe('Quantity must be positive.');
});
it('handles timeouts and network errors', () => {
  expect(recordWorkError({ code: 'ECONNABORTED' })).toMatch(/timed out/);
  expect(recordWorkError(new Error('Network'), 'Check your connection and retry.')).toMatch(/connection/);
});
