import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SidebarSpecs } from './RedesignSalesComponents';

describe('SidebarSpecs with real editing controls', () => {
  const assigned = { id: 'assigned_to', label: 'Assigned', icon: 'user', value: 7, displayValue: 'Current employee', initialLabel: 'Current employee', fetchOptions: vi.fn().mockResolvedValue({ results: [{ id: 82, label: 'Employee Ada' }] }) };
  it('does not expose editing controls without edit permission', () => {
    render(<SidebarSpecs specs={[assigned]} />);
    fireEvent.click(screen.getByText('Current employee'));
    expect(screen.queryByRole('button', { name: 'Edit Assigned' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
  it('keeps catalog IDs when saving through the real async selector', async () => {
    const save = vi.fn().mockResolvedValue(true);
    render(<SidebarSpecs specs={[assigned]} onInlineSave={save} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit Assigned' }));
    fireEvent.click(screen.getByRole('combobox', { name: 'Assigned' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Employee Ada' }));
    await waitFor(() => expect(save).toHaveBeenCalledWith('assigned_to', 82, expect.objectContaining({ id: 82 })));
    await waitFor(() => expect(screen.queryByRole('combobox')).not.toBeInTheDocument());
  });
  it('keeps failed edits open instead of showing a saved value', async () => {
    const save = vi.fn().mockResolvedValue(false);
    render(<SidebarSpecs specs={[assigned]} onInlineSave={save} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit Assigned' }));
    fireEvent.click(screen.getByRole('combobox', { name: 'Assigned' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Employee Ada' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Change could not be saved');
    expect(screen.getByRole('combobox', { name: 'Assigned' })).toBeInTheDocument();
  });
  it('supports explicit unassignment through the clear control', async () => {
    const save = vi.fn().mockResolvedValue(true);
    render(<SidebarSpecs specs={[assigned]} onInlineSave={save} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit Assigned' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear Assigned' }));
    await waitFor(() => expect(save).toHaveBeenCalledWith('assigned_to', '', null));
  });
});
