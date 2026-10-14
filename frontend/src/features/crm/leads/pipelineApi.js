import api from '../../../services/axios';

const label = (state) => String(state || '').replaceAll('_', ' ').replace(/\b\w/g, (match) => match.toUpperCase());

export function pipelineRow(item) {
  const isLead = item.kind === 'lead';
  return {
    ...item,
    row_type: item.kind,
    lead_id: isLead ? item.id : null,
    opportunity_id: isLead ? null : item.id,
    display_number: item.number || String(item.sales_number || item.id),
    name: item.customer_name || [item.first_name, item.last_name].filter(Boolean).join(' '),
    status: item.system_state,
    lead_status: isLead ? item.system_state : '',
    opp_status: isLead ? '' : item.system_state,
    workflow_stage: isLead && item.system_state === 'new' ? 'new_lead' : item.system_state,
    workflow_stage_label: label(item.system_state),
    custom_status_code: item.custom_status_code_id,
    assigned_user_id: item.assigned_employee_id,
    assigned_user_name: item.assigned_employee_name,
    branch: item.branch_id,
    value: Number(item.estimated_amount ?? item.lead_cost ?? 0),
  };
}

export async function getPipelineQueue(params = {}) {
  const pageSize = Math.min(200, Math.max(1, Number(params.page_size || params.limit || 50)));
  const offset = params.offset ?? (Math.max(1, Number(params.page || 1)) - 1) * pageSize;
  const kind = params.row_type || 'all';
  const systemState = kind === 'lead' ? params.lead_status : kind === 'opportunity'
    ? params.opp_status : params.lead_status === params.opp_status ? params.lead_status : null;
  const query = {
    kind, limit: pageSize, offset,
    ...(params.branch ? { branch_id: Number(params.branch) } : {}),
    ...(params.assigned_employee_id ? { assigned_employee_id: Number(params.assigned_employee_id) } : {}),
    ...(params.assigned_user ? { assigned_user_id: Number(params.assigned_user) } : {}),
    ...(params.unassigned_leads_only ? { unassigned: true } : {}),
    ...(params.search ? { search: params.search } : {}),
    ...(systemState ? { system_state: systemState === 'contacted' ? 'in_progress' : systemState } : {}),
  };
  const page = await api.get('/tenant/pipeline/', { params: query });
  return {
    count: page.total,
    page: Math.floor(offset / pageSize) + 1,
    page_size: pageSize,
    total_pages: Math.max(1, Math.ceil(page.total / pageSize)),
    results: (page.items || []).map(pipelineRow),
  };
}
