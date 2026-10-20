import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ChooseTemplateTypeModal, { TEMPLATE_TYPES } from './ChooseTemplateTypeModal';

describe('ChooseTemplateTypeModal', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <ChooseTemplateTypeModal isOpen={false} onClose={vi.fn()} onSelectType={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders all three cards with titles, badges, and descriptions', () => {
    render(
      <ChooseTemplateTypeModal isOpen={true} onClose={vi.fn()} onSelectType={vi.fn()} initialType="document" />
    );

    expect(screen.getByText('Create a New Template')).toBeInTheDocument();
    expect(screen.getByText('Document Template')).toBeInTheDocument();
    expect(screen.getByText('Estimate Template')).toBeInTheDocument();
    expect(screen.getByText('Email & SMS Template')).toBeInTheDocument();

    expect(screen.getByText('Legal & Operations')).toBeInTheDocument();
    expect(screen.getByText('Customer Portal')).toBeInTheDocument();
    expect(screen.getByText('Messaging & Alerts')).toBeInTheDocument();
  });

  it('preselects the initialType passed as prop', () => {
    render(
      <ChooseTemplateTypeModal isOpen={true} onClose={vi.fn()} onSelectType={vi.fn()} initialType="estimate" />
    );

    const estimateCard = screen.getByRole('radio', { name: /estimate template/i });
    expect(estimateCard).toHaveAttribute('aria-checked', 'true');

    const docCard = screen.getByRole('radio', { name: /document template/i });
    expect(docCard).toHaveAttribute('aria-checked', 'false');
  });

  it('allows clicking another card to change selection', () => {
    render(
      <ChooseTemplateTypeModal isOpen={true} onClose={vi.fn()} onSelectType={vi.fn()} initialType="document" />
    );

    const commCard = screen.getByRole('radio', { name: /email & sms template/i });
    fireEvent.click(commCard);
    expect(commCard).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onSelectType when Continue button is clicked', () => {
    const onSelectType = vi.fn();
    render(
      <ChooseTemplateTypeModal isOpen={true} onClose={vi.fn()} onSelectType={onSelectType} initialType="estimate" />
    );

    const continueBtn = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(continueBtn);

    expect(onSelectType).toHaveBeenCalledTimes(1);
    expect(onSelectType).toHaveBeenCalledWith('estimate');
  });

  it('calls onSelectType immediately on card double-click', () => {
    const onSelectType = vi.fn();
    render(
      <ChooseTemplateTypeModal isOpen={true} onClose={vi.fn()} onSelectType={onSelectType} initialType="document" />
    );

    const commCard = screen.getByRole('radio', { name: /email & sms template/i });
    fireEvent.doubleClick(commCard);

    expect(onSelectType).toHaveBeenCalledTimes(1);
    expect(onSelectType).toHaveBeenCalledWith('communication');
  });

  it('calls onClose when Cancel button or Close X is clicked', () => {
    const onClose = vi.fn();
    render(
      <ChooseTemplateTypeModal isOpen={true} onClose={onClose} onSelectType={vi.fn()} />
    );

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    const closeBtn = screen.getByRole('button', { name: /close dialog/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('supports keyboard navigation with arrow keys and Enter', () => {
    const onSelectType = vi.fn();
    render(
      <ChooseTemplateTypeModal isOpen={true} onClose={vi.fn()} onSelectType={onSelectType} initialType="document" />
    );

    // Arrow down moves from document -> estimate
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    const estimateCard = screen.getByRole('radio', { name: /estimate template/i });
    expect(estimateCard).toHaveAttribute('aria-checked', 'true');

    // Enter confirms
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onSelectType).toHaveBeenCalledWith('estimate');
  });
});
