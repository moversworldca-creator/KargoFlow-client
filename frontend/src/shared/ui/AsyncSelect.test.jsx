import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AsyncSelect from './AsyncSelect';

describe('AsyncSelect', () => {
  it('stops on failure and retries only when requested', async () => {
    const fetchOptions = vi.fn().mockRejectedValueOnce(new Error('Failed')).mockResolvedValue({ results: [{ id: 7, label: 'Ada' }] });
    render(<AsyncSelect fetchOptions={fetchOptions} onChange={vi.fn()} placeholder="Assignee" />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load options');
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 400)); });
    expect(fetchOptions).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('option', { name: 'Ada' })).toBeInTheDocument();
    expect(fetchOptions).toHaveBeenCalledTimes(2);
  });
  it('ignores old search responses even when the first request is still running', async () => {
    let resolveOld;
    const fetchOptions = vi.fn().mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }))
      .mockResolvedValue({ results: [{ id: 2, label: 'New result' }] });
    render(<AsyncSelect fetchOptions={fetchOptions} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));
    await waitFor(() => expect(fetchOptions).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new' } });
    expect(await screen.findByRole('option', { name: 'New result' })).toBeInTheDocument();
    await act(async () => resolveOld({ results: [{ id: 1, label: 'Old result' }] }));
    expect(screen.queryByRole('option', { name: 'Old result' })).not.toBeInTheDocument();
  });
  it('opens with the keyboard, focuses options and restores focus on Escape', async () => {
    render(<AsyncSelect fetchOptions={vi.fn().mockResolvedValue({ results: [{ id: 7, label: 'Ada' }] })} onChange={vi.fn()} />);
    const trigger = screen.getByRole('combobox');
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    const option = await screen.findByRole('option', { name: 'Ada' });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'ArrowDown' });
    expect(option).toHaveFocus();
    fireEvent.keyDown(option, { key: 'Escape' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });
  it('derives pagination from count and loads more only on demand', async () => {
    const fetchOptions = vi.fn().mockResolvedValueOnce({ count: 2, results: [{ id: 1, label: 'First' }] })
      .mockResolvedValueOnce({ count: 2, results: [{ id: 2, label: 'Second' }] });
    render(<AsyncSelect fetchOptions={fetchOptions} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(await screen.findByRole('button', { name: 'Load more' }));
    expect(await screen.findByRole('option', { name: 'Second' })).toBeInTheDocument();
    expect(fetchOptions).toHaveBeenLastCalledWith('', 1, 20);
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });
});
