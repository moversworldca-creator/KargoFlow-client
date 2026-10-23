import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import UnifiedTemplateBuilder from './UnifiedTemplateBuilder';
import { getBuilderTemplateDraft } from '../../../../services/api';

vi.mock('../../../../services/api', async (original) => ({
  ...await original(), getBuilderTemplateDraft: vi.fn(),
}));
vi.mock('./components/TopNavbar', () => ({ default: ({ title }) => <h1>{title}</h1> }));
vi.mock('./components/LeftSidebar', () => ({ default: () => null }));
vi.mock('./components/RightPropertiesPanel', () => ({ default: () => null }));
vi.mock('./components/DocumentCanvas', () => ({ default: ({ items }) => <div data-testid="saved-blocks">{items.map(item => item.props?.text || item.text || item.content || item.type).join('|')}</div> }));

const document = (text) => ({ settings: {}, header: [], footer: [], rules: [], attachments: [],
  sections: [{ key: 'main', blocks: text ? [{ key: 'latest', type: 'heading', props: { text, level: 1 } }] : [] }],
});
const response = (text) => ({ data: { template: { name: 'Latest tenant copy' }, revision: { lock_version: 3 }, document: document(text) } });

beforeEach(() => vi.clearAllMocks());

describe('Copied template draft hydration', () => {
  it('waits for the saved copy before showing content instead of a stale preset', async () => {
    let complete;
    getBuilderTemplateDraft.mockReturnValue(new Promise(resolve => { complete = resolve; }));
    render(<UnifiedTemplateBuilder mode="invoice" draft={{ id: 33, name: 'Summary', content: { items: [{ id: 'old', type: 'text', content: 'Stale content' }] } }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading saved template');
    expect(screen.queryByTestId('saved-blocks')).not.toBeInTheDocument();
    complete(response('Latest published heading'));
    expect(await screen.findByTestId('saved-blocks')).toHaveTextContent('Latest published heading');
    expect(screen.queryByText('Stale content')).not.toBeInTheDocument();
  });

  it('blocks editing after a load error and retries the saved document', async () => {
    getBuilderTemplateDraft.mockRejectedValueOnce(new Error('Network failure')).mockResolvedValueOnce(response('Loaded after retry'));
    render(<UnifiedTemplateBuilder mode="contract" draft={{ id: 34, name: 'Copied contract' }} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load the saved template');
    expect(screen.queryByTestId('saved-blocks')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Retry loading template'));
    expect(await screen.findByTestId('saved-blocks')).toHaveTextContent('Loaded after retry');
    expect(getBuilderTemplateDraft).toHaveBeenCalledTimes(2);
  });

  it('preserves an intentionally empty copied document', async () => {
    getBuilderTemplateDraft.mockResolvedValue(response(''));
    render(<UnifiedTemplateBuilder mode="invoice" draft={{ id: 35, name: 'Blank copy' }} />);
    expect(await screen.findByTestId('saved-blocks')).toHaveTextContent('');
  });

  it('does not replace an already hydrated empty document with a starter layout', () => {
    render(<UnifiedTemplateBuilder mode="invoice" draft={{ id: 36, name: 'Empty published layout', isHydratedFromServer: true,
      content: { name: 'Empty published layout', items: [], pages: [{ id: 'p1', items: [] }], settings: {} } }} />);
    expect(screen.getByTestId('saved-blocks')).toHaveTextContent('');
    expect(getBuilderTemplateDraft).not.toHaveBeenCalled();
  });
});
