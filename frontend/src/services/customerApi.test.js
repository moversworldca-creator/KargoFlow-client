import { beforeEach, expect, it, vi } from 'vitest';
import api from './axios';
import {
  getCustomers, getCustomer, createCustomer, updateCustomer,
  createCustomerContact, updateCustomerContact, deleteCustomerContact,
} from './api';

vi.mock('./axios', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
beforeEach(() => vi.resetAllMocks());

const profile = {
  customer: { id: 321, profile_name: 'Dinesh Kumar' },
  contacts: [{ id: 7, name: 'Dinesh Kumar', email: 'old@example.com', phone: '555-1111', is_primary: true, is_active: true }],
};

it('lists and reads customers through tenant profile routes', async () => {
  api.get.mockResolvedValueOnce({ count: 1, results: [{ id: 321, profile_name: 'Dinesh Kumar', primary_email: 'old@example.com' }] })
    .mockResolvedValueOnce(profile);
  expect((await getCustomers()).results[0].email).toBe('old@example.com');
  expect((await getCustomer(321)).contacts).toHaveLength(1);
  expect(api.get).toHaveBeenNthCalledWith(1, '/tenant/customers/', { params: undefined });
  expect(api.get).toHaveBeenNthCalledWith(2, '/tenant/customers/321/profile/');
});

it('creates the customer and primary contact with the backend contract', async () => {
  api.post.mockResolvedValue({ id: 321 });
  api.get.mockResolvedValue(profile);
  const customer = await createCustomer({ first_name: 'Dinesh', last_name: 'Kumar', email: 'old@example.com', primary_phone: '555-1111' });
  expect(api.post).toHaveBeenCalledWith('/tenant/customers/', {
    profile_name: 'Dinesh Kumar', customer_type: 'individual', notes: '',
    primary_contact: { name: 'Dinesh Kumar', email: 'old@example.com', phone: '555-1111', phone_type: '' },
  });
  expect(customer.id).toBe(321);
});

it('updates primary contact values on the nested contact endpoint', async () => {
  api.get.mockResolvedValue(profile);
  await updateCustomer(321, { first_name: 'Dinesh', last_name: 'Kumar', email: 'new@example.com', primary_phone: '555-1111' });
  expect(api.patch).toHaveBeenCalledWith('/tenant/customers/321/contacts/7/', {
    name: 'Dinesh Kumar', email: 'new@example.com', phone: '555-1111',
  });
  expect(api.patch).not.toHaveBeenCalledWith('/tenant/customers/321/', expect.anything());
});

it('creates, updates, and deactivates additional contacts under their customer', async () => {
  await createCustomerContact({ customer: 321, name: 'Asha', email: 'asha@example.com' });
  await updateCustomerContact(9, { name: 'Asha B', email: 'asha@example.com' }, 321);
  await deleteCustomerContact(9, 321);
  expect(api.post).toHaveBeenCalledWith('/tenant/customers/321/contacts/', { name: 'Asha', email: 'asha@example.com' });
  expect(api.patch).toHaveBeenCalledWith('/tenant/customers/321/contacts/9/', { name: 'Asha B', email: 'asha@example.com' });
  expect(api.delete).toHaveBeenCalledWith('/tenant/customers/321/contacts/9/');
});
