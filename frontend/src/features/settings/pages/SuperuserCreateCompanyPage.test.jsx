import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SuperuserCreateCompanyPage from './SuperuserCreateCompanyPage';

const navigate = vi.fn();
const mockShowToast = vi.fn();
const authState = vi.hoisted(() => ({
  user: { id: 1, company: 1, is_superuser: true },
  login: vi.fn(() => Promise.resolve()),
}));

const mockDeleteCompany = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

vi.mock('../../auth/context/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('../../../shared/context/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

vi.mock('../../../services/api', () => ({
  createCompany: vi.fn(() => Promise.resolve({ id: 1, name: 'Test Moving Co' })),
  onboardCompany: vi.fn((data) => Promise.resolve({ company: { id: 2, name: data.name, subdomain: data.subdomain }, owner_email: data.owner_email })),
  getCompanies: vi.fn(() => Promise.resolve([
    { id: 1, name: 'Apex Main Co', email: 'apex@test.com' },
    { id: 2, name: 'Secondary Branch Co', email: 'branch@test.com' }
  ])),
  updateCompany: vi.fn(() => Promise.resolve({ id: 1, name: 'Apex Moving Updated' })),
  deleteCompany: mockDeleteCompany,
}));

describe('SuperuserCreateCompanyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.user = { id: 1, company: 1, is_superuser: true };
  });

  it('renders Superuser Create Company page when user is superuser', async () => {
    await act(async () => {
      render(<SuperuserCreateCompanyPage />);
    });
    expect(screen.getByText('Company Profile Provisioning')).toBeInTheDocument();
    expect(screen.getByText(/Company Admin Owner Credentials/i)).toBeInTheDocument();
  });

  it('shows access restricted warning when user is not superuser', async () => {
    authState.user = { id: 2, is_superuser: false, is_system_admin: false };
    await act(async () => {
      render(<SuperuserCreateCompanyPage />);
    });
    expect(screen.getByText('Superuser Access Required')).toBeInTheDocument();
  });

  it('autofills subdomain based on company name', async () => {
    await act(async () => {
      render(<SuperuserCreateCompanyPage />);
    });
    const nameInput = screen.getByPlaceholderText('e.g. Apex Moving & Storage');
    fireEvent.change(nameInput, { target: { value: 'Apex Moving Service' } });
    const subdomainInput = screen.getByPlaceholderText('e.g. apex-moving');
    expect(subdomainInput.value).toBe('apex-moving-service');
  });

  it('does not display delete button for the main company profile', async () => {
    render(<SuperuserCreateCompanyPage />);

    await waitFor(() => {
      expect(screen.getByText('Apex Main Co')).toBeInTheDocument();
      expect(screen.getByText('Main Root')).toBeInTheDocument();
    });
  });

  it('provisions new company with admin credentials and shows success banner with login button', async () => {
    render(<SuperuserCreateCompanyPage />);

    const emailInput = screen.getByPlaceholderText('admin@newcompany.com');
    const passwordInput = screen.getByPlaceholderText('Create secure password');
    const nameInput = screen.getByPlaceholderText('e.g. Apex Moving & Storage');
    const companyEmailInput = screen.getByPlaceholderText('sales@apexmoving.com');
    const phoneInput = screen.getByPlaceholderText('+1 (800) 555-0199');

    fireEvent.change(emailInput, { target: { value: 'owner@apex.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Secret123!' } });
    fireEvent.change(nameInput, { target: { value: 'Secondary Branch Co' } });
    fireEvent.change(companyEmailInput, { target: { value: 'sales@apex.com' } });
    fireEvent.change(phoneInput, { target: { value: '555-1234' } });

    const form = emailInput.closest('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('New Company Provisioned Successfully')).toBeInTheDocument();
    });

    const loginBtn = screen.getByRole('button', { name: /Login to Secondary Branch Co/i });
    fireEvent.click(loginBtn);

    await waitFor(() => {
      expect(authState.login).toHaveBeenCalledWith('owner@apex.com', 'Secret123!');
      expect(navigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('shows delete confirmation popup alert when clicking delete button on non-main company and handles deletion', async () => {
    render(<SuperuserCreateCompanyPage />);

    await waitFor(() => {
      expect(screen.getByText('Secondary Branch Co')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByTitle('Delete Company Profile');
    fireEvent.click(deleteBtn);

    expect(screen.getByText('Delete Company Profile?')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /Yes, Delete/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockDeleteCompany).toHaveBeenCalledWith(2);
      expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('deleted successfully'), 'success');
    });
  });
});
