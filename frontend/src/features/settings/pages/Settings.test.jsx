import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Settings from './Settings';
import API from '../../../services/api';

const navigate = vi.fn();
const authUser = vi.hoisted(() => ({ id: 1, is_superuser: true }));
const permissions = vi.hoisted(() => ({ canAll: () => true }));
const routeState = vi.hoisted(() => ({ params: {} }));
const estimatePortalTemplatesState = vi.hoisted(() => ({ props: null }));

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
  useParams: () => routeState.params,
}));

vi.mock('../../auth/context/AuthContext', () => ({
  useAuth: () => ({ user: authUser }),
}));

vi.mock('../../../shared/auth/useCan', () => ({
  default: () => permissions,
}));

vi.mock('../../../services/api', () => ({
  default: {
    general: {
      getBranches: vi.fn(() => Promise.resolve({
        results: [
          { id: 5, name: 'Main Branch' },
        ],
      })),
    },
  },
  updateUser: vi.fn(),
}));

vi.mock('../components/EstimatePortalTemplates', () => ({
  default: (props) => {
    estimatePortalTemplatesState.props = props;
    return <div data-testid="estimate-portal-templates" />;
  },
}));

describe('Settings search', () => {
  beforeEach(() => {
    navigate.mockClear();
    routeState.params = {};
    estimatePortalTemplatesState.props = null;
  });

  it('matches multiple terms across a setting name and category metadata', () => {
    render(<Settings />);
    const search = screen.getByRole('searchbox', { name: 'Search settings' });

    fireEvent.change(search, { target: { value: 'portal estimate' } });

    expect(screen.getByText('2 settings found')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Estimate Portal Templates/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Customer Portal Settings/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Company Profile/i })).not.toBeInTheDocument();
  });

  it('searches category names and clears with Escape', () => {
    render(<Settings />);
    const search = screen.getByRole('searchbox', { name: 'Search settings' });

    fireEvent.change(search, { target: { value: 'workspace' } });
    expect(screen.getByRole('button', { name: /Company Profile/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Mover Sizes/i })).not.toBeInTheDocument();

    fireEvent.keyDown(search, { key: 'Escape' });
    expect(search).toHaveValue('');
    expect(screen.getByRole('button', { name: /Mover Sizes/i })).toBeInTheDocument();
  });

  it('shows the settings hub while branches are still loading', () => {
    API.general.getBranches.mockReturnValueOnce(new Promise(() => {}));

    render(<Settings />);

    expect(screen.getByRole('heading', { name: 'Settings Hub' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Company Profile/i })).toBeEnabled();
  });

  it('keeps navigation available while a branch-scoped panel is loading', () => {
    API.general.getBranches.mockReturnValueOnce(new Promise(() => {}));
    routeState.params = { tabId: 'estimate-portal-templates' };

    render(<Settings />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading branch scope...');
    expect(screen.queryByTestId('estimate-portal-templates')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Settings Hub Overview' }));
    expect(navigate).toHaveBeenCalledWith('/settings');
  });

  it('keeps the estimate portal templates builder route mounted', async () => {
    routeState.params = { tabId: 'estimate-portal-templates', subView: 'builder', itemId: 'new' };

    render(<Settings />);

    expect(await screen.findByTestId('estimate-portal-templates')).toBeInTheDocument();
    expect(estimatePortalTemplatesState.props?.builderRouteView).toBe('builder');
    expect(estimatePortalTemplatesState.props?.builderRouteItemId).toBe('new');
  });
});
