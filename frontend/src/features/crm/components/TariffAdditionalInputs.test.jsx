import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import TariffAdditionalInputs from './TariffAdditionalInputs';

function Harness() {
  const [value, setValue] = useState({ fees: [{ fee_id: 'stairs', quantity: '2' }], valuation: { declared_value: '20000' } });
  return <><TariffAdditionalInputs value={value} onChange={setValue} configuration={{
    additional_services: [{ id: 'stairs', name: 'Stairs' }],
    valuation: { options: [{ id: 'full', name: 'Full value' }] },
    materials: [{ id: 'box', name: 'Box' }],
  }} /><output data-testid="inputs">{JSON.stringify(value)}</output></>;
}

describe('additional tariff inputs', () => {
  it('saves named valuation, fees, materials and route quantities without losing other fields', () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('Valuation option'), { target: { value: 'full' } });
    fireEvent.change(screen.getByLabelText('Stairs quantity'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Set materials/ }));
    fireEvent.change(screen.getByLabelText('Box quantity'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('origin to destination miles'), { target: { value: '42' } });
    expect(JSON.parse(screen.getByTestId('inputs').textContent)).toMatchObject({
      valuation: { option_id: 'full', declared_value: '20000' },
      fees: [{ fee_id: 'stairs', quantity: '3' }], materials: [{ material_id: 'box', quantity: '5' }],
      route: { origin_to_destination: { miles: '42' } },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /Set materials/ }));
    expect(JSON.parse(screen.getByTestId('inputs').textContent).materials).toBeNull();
  });
});
