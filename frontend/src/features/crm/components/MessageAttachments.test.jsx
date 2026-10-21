import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, it, expect } from 'vitest';
import api from '../../../services/axios';
import MessageAttachments from './MessageAttachments';

vi.mock('../../../services/axios', () => ({ default: { get: vi.fn() } }));

it('downloads binary through the authenticated client using canonical ids', async () => {
  api.get.mockResolvedValue(new Blob(['pdf']));
  URL.createObjectURL = vi.fn(() => 'blob:attachment');
  URL.revokeObjectURL = vi.fn();
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  render(<MessageAttachments messageId={8} attachments={[{ id: 3, filename: 'quote.pdf', size_bytes: 1024 }]} />);
  fireEvent.click(screen.getByRole('button', { name: 'quote.pdf (1 KB)' }));
  await waitFor(() => expect(click).toHaveBeenCalled());
  expect(api.get).toHaveBeenCalledWith('/tenant/communications/messages/8/attachments/3/', { responseType: 'blob' });
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:attachment');
  click.mockRestore();
});

it('shows a retryable error when download fails', async () => {
  api.get.mockRejectedValue(new Error('denied'));
  render(<MessageAttachments messageId={8} attachments={[{ id: 3, filename: 'file.txt' }]} />);
  fireEvent.click(screen.getByRole('button', { name: 'file.txt' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not download attachment');
});
