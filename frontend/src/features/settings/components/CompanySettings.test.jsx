import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CompanySettings from './CompanySettings';

vi.mock('../../../services/api', () => ({
  getTenantCompany: vi.fn().mockResolvedValue([{
    id: 17,
    name: 'Northstar Freight',
    legal_name: 'Northstar Freight Ltd.',
    email: 'ops@northstar.test',
    phone: '+1 555 0100',
    city: 'Toronto',
    country: 'Canada',
    currency: 'CAD',
  }]),
}));

describe('CompanySettings', () => {
  it('loads the authenticated tenant company profile', async () => {
    render(<CompanySettings />);

    expect(await screen.findByDisplayValue('Northstar Freight')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Northstar Freight Ltd.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('ops@northstar.test')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Toronto')).toBeInTheDocument();
  });
});
