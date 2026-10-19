import { describe, it, expect } from 'vitest';
import { normalizeCommunicationTokens } from './CommunicationTemplates';

describe('normalizeCommunicationTokens', () => {
  it('converts PascalCase Customer and Company tokens to lowercase backend tokens', () => {
    expect(normalizeCommunicationTokens('Hello {{Customer.first_name}}, welcome to {{Company.name}}!'))
      .toBe('Hello {{customer.first_name}}, welcome to {{company.name}}!');
  });

  it('converts Customer.full_name and customer.full_name to customer.name', () => {
    expect(normalizeCommunicationTokens('Hi {{Customer.full_name}}'))
      .toBe('Hi {{customer.name}}');
    expect(normalizeCommunicationTokens('Hi {{customer.full_name}}'))
      .toBe('Hi {{customer.name}}');
  });

  it('converts phone and email tokens properly', () => {
    expect(normalizeCommunicationTokens('Call {{Customer.phone}} or email {{Customer.email}}'))
      .toBe('Call {{customer.phone}} or email {{customer.email}}');
    expect(normalizeCommunicationTokens('Call us at {{Company.phone}}'))
      .toBe('Call us at {{branch.phone}}');
  });

  it('leaves already valid lowercase tokens intact', () => {
    expect(normalizeCommunicationTokens('Hello {{customer.first_name}} on {{move.date}}'))
      .toBe('Hello {{customer.first_name}} on {{move.date}}');
  });

  it('handles empty or non-string inputs gracefully', () => {
    expect(normalizeCommunicationTokens('')).toBe('');
    expect(normalizeCommunicationTokens(null)).toBe(null);
  });
});
