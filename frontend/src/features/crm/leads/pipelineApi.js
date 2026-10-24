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
    value: Number(item.estimated_amount ?? 0),
  };
}

// Fetch every authorized page before applying filters the backend cannot express.
// No module cache: responses must never survive a tenant/session switch.
export async function getPipelineRecords(params = {}) {
  let employeeId = params.assigned_employee_id;
  if (!employeeId && params.assigned_user) {
    // Staff selectors use login IDs; pipeline assignments use employee IDs.
    let offset = 0;
    while (!employeeId) {
      const page = await api.get('/tenant/employees/', { params: { limit: 200, offset, ...(params.branch ? { branch_id: Number(params.branch) } : {}) } });
      const employees = page.results || [];
      employeeId = employees.find((employee) => String(employee.user_id) === String(params.assigned_user))?.id;
      offset += employees.length;
      if (!employees.length || offset >= page.count) break;
    }
    if (!employeeId) return [];
  }
  const query = {
    kind: params.row_type || 'all', limit: 200, offset: 0,
    ...(params.branch ? { branch_id: Number(params.branch) } : {}),
    ...(employeeId ? {
      assigned_employee_id: Number(employeeId),
    } : {}),
    ...(params.unassigned_leads_only ? { unassigned: true } : {}),
    ...(params.search ? { search: params.search } : {}),
  };
  const rows = [];
  let total = Infinity;
  while (rows.length < total) {
    const page = await api.get('/tenant/pipeline/', { params: { ...query, offset: rows.length } });
    total = Number(page.total || 0);
    if (!page.items?.length) {
      if (rows.length < total) throw new Error('Pipeline response was incomplete. Please retry.');
      break;
    }
    rows.push(...page.items.map(pipelineRow));
  }
  return rows;
}

const state = (value) => ({ contacted: 'in_progress', new_lead: 'new' }[value] || value);
const includes = (value, search) => String(value || '').toLowerCase().includes(String(search).toLowerCase());

export function filterPipelineRows(rows, params = {}) {
  const excluded = (value) => String(value || '').split(',').filter(Boolean);
  const filtered = rows.filter((row) => {
    const isLead = row.row_type === 'lead';
    const wanted = isLead ? params.lead_status : params.opp_status;
    // An opportunity-only status query must not also include every lead.
    if (!params.row_type && params.opp_status && !params.lead_status && isLead) return false;
    if (wanted && (/^\d+$/.test(wanted) ? String(row.custom_status_code) !== String(wanted) : row.status !== state(wanted))) return false;
    if (params.custom_status_code && String(row.custom_status_code) !== String(params.custom_status_code)) return false;
    if (excluded(isLead ? params.lead_exclude_status : params.opp_exclude_status).includes(row.status)) return false;
    if (params.exclude_unassigned_leads && isLead && !row.assigned_user_id) return false;
    if (params.province && !includes(row.origin_state, params.province)) return false;
    if (params.origin && !includes(row.origin_city, params.origin)) return false;
    if (params.destination && !includes(row.destination_city, params.destination)) return false;
    const field = ['received', 'created_at'].includes(params.date_field) ? 'created_at' : 'move_date';
    const date = String(row[field] || '').slice(0, 10);
    if (params.startDate && (!date || date < params.startDate.slice(0, 10))) return false;
    if (params.endDate && (!date || (params.endExclusive ? date >= params.endDate.slice(0, 10) : date > params.endDate.slice(0, 10)))) return false;
    return true;
  });
  const ordering = String(params.ordering || '-created_at').split(',');
  const aliases = { lead_cost: 'value', assigned_at: 'created_at', customer_name: 'name', sales_number: 'sales_number' };
  return filtered.sort((a, b) => {
    for (const order of ordering) {
      const descending = order.startsWith('-');
      const key = aliases[order.replace(/^-/, '')] || order.replace(/^-/, '');
      const av = a[key]; const bv = b[key];
      const comparison = typeof av === 'number' && typeof bv === 'number'
        ? av - bv : String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true });
      if (comparison) return descending ? -comparison : comparison;
    }
    return String(a.row_type + a.id).localeCompare(String(b.row_type + b.id));
  });
}

export async function getPipelineQueue(params = {}) {
  const rows = filterPipelineRows(await getPipelineRecords(params), params);
  const pageSize = Math.max(1, Number(params.page_size || params.limit || 50));
  const offset = params.offset ?? (Math.max(1, Number(params.page || 1)) - 1) * pageSize;
  const converted = rows.filter((row) => row.row_type === 'lead' && row.status === 'converted').length;
  const leads = rows.filter((row) => row.row_type === 'lead').length;
  return {
    count: rows.length,
    page: Math.floor(offset / pageSize) + 1,
    page_size: pageSize,
    total_pages: Math.max(1, Math.ceil(rows.length / pageSize)),
    summary: {
      total: rows.length, lead_count: leads, opportunity_count: rows.length - leads,
      new_count: rows.filter((row) => row.row_type === 'lead' && row.status === 'new').length,
      value_total: rows.reduce((sum, row) => sum + row.value, 0),
      conversion_rate: leads ? converted / leads * 100 : 0,
    },
    results: params.all ? rows : rows.slice(offset, offset + pageSize),
  };
}
