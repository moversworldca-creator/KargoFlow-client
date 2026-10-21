import api from '../../../services/axios';

// Normalize the tenant detail contract for the shared lead/opportunity workspace.
export async function readOpportunity(id) {
  const record = await api.get(`/tenant/opportunities/${id}/`);
  const { item = {}, details = {}, customer } = await api.get(`/tenant/pipeline/opportunity/${id}/`);
  const contact = customer?.contacts?.find((entry) => entry.is_primary) || customer?.contacts?.[0];
  const customerName = String(customer?.profile_name || item.customer_name || '').trim();
  const customerNameParts = customerName.split(/\s+/).filter(Boolean);
  return {
    ...record, ...details,
    status: record.system_state, workflow_stage: record.system_state,
    branch: record.branch_id, customer: record.customer_id, lead: record.lead_id,
    customer_details: {
      ...(customer || {}), id: record.customer_id,
      full_name: customerName,
      first_name: customer?.first_name || customerNameParts[0] || '',
      last_name: customer?.last_name || customerNameParts.slice(1).join(' '),
      email: contact?.email || item.email || '', primary_phone: contact?.phone || item.phone || '',
    },
    assigned_user: record.assigned_employee_id,
    assigned_user_details: record.assigned_employee_id ? { id: record.assigned_employee_id, full_name: item.assigned_employee_name } : null,
    move_type: record.move_type_id, service_type: record.service_type_id, mover_size: record.move_size_id,
    referral_source: record.referral_source_id, custom_status_code: record.custom_status_code_id,
    branch_details: { id: record.branch_id, name: item.branch_name },
    origin_address_details: details.origin_address,
    destination_address_details: details.destination_address,
  };
}
