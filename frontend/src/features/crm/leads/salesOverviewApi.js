import api from '../../../services/axios';
import { getPipelineRecords, filterPipelineRows } from './pipelineApi';

async function mapRecords(rows, callback) {
  const output = new Array(rows.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(6, rows.length) }, async () => {
    while (next < rows.length) {
      const index = next++;
      output[index] = await callback(rows[index]);
    }
  }));
  return output.flat();
}

const base = (row) => `/tenant/${row.row_type === 'lead' ? 'leads' : 'opportunities'}/${row.id}/`;
const inPeriod = (date, params) => {
  const value = String(date || '').slice(0, 10);
  return (!params.startDate || value >= params.startDate) && (!params.endDate || value < params.endDate);
};

export async function getRecordWork(params = {}, type = 'tasks', kind) {
  const records = await getPipelineRecords({ ...params, assigned_user: type === 'tasks' ? undefined : params.assigned_user, row_type: kind });
  const rows = await mapRecords(records, async (record) => {
    const response = await api.get(`${base(record)}${type}/`);
    const items = Array.isArray(response) ? response : response.results || [];
    return items.map((item) => ({
      ...item,
      record_kind: record.row_type, record_id: record.id,
      lead: record.row_type === 'lead' ? record.id : null,
      opportunity: record.row_type === 'opportunity' ? record.id : null,
      related_record_details: record,
      activity_type: item.activity_type,
      assigned_to: item.assigned_to_id,
      activity_details: { ...item, subject: item.title || item.subject },
    }));
  });
  const filtered = rows.filter((item) => (!params.status || item.status === params.status)
    && (!params.activity_type || item.activity_type === params.activity_type)
    && (type !== 'tasks' || !params.assigned_user || String(item.assigned_to_id) === String(params.assigned_user))
    && inPeriod(item.created_at, params));
  const ordering = String(params.ordering || '-created_at');
  const key = ordering.replace(/^-/, '').replace('activity__', '');
  filtered.sort((a, b) => String(a[key] ?? '').localeCompare(String(b[key] ?? ''), undefined, { numeric: true }) * (ordering.startsWith('-') ? -1 : 1));
  const pageSize = params.page_size || filtered.length || 1;
  const offset = ((params.page || 1) - 1) * pageSize;
  return { count: filtered.length, results: filtered.slice(offset, offset + pageSize), summary: {
    total: filtered.length,
    new_count: filtered.filter((row) => row.status !== 'completed').length,
    hot_count: filtered.filter((row) => row.status !== 'completed' && row.due_date && new Date(row.due_date) < new Date()).length,
    value_total: filtered.filter((row) => row.status !== 'completed').reduce((sum, row) => sum + row.related_record_details.value, 0),
  } };
}

export const getTenantTasks = (params) => getRecordWork(params);
export const getTenantActivities = (params) => getRecordWork(params, 'activities', 'opportunity');
export const getTenantLeadActivities = (params) => getRecordWork(params, 'activities', 'lead');
export const updateTenantTask = (item, data) => api.patch(`${base({ row_type: item.related_type, id: item.related_id })}tasks/${item.task_id}/`, data);

export async function getTenantSalesOverview(params = {}) {
  const rows = filterPipelineRows(await getPipelineRecords(params), { ...params, date_field: 'created_at', endExclusive: true });
  const daily = new Map();
  rows.filter((row) => row.row_type === 'lead').forEach((row) => {
    const date = row.created_at.slice(0, 10);
    daily.set(date, (daily.get(date) || 0) + 1);
  });
  return {
    leadsCount: rows.filter((row) => row.row_type === 'lead').length,
    wonCount: rows.filter((row) => row.row_type === 'opportunity' && row.status === 'booked').length,
    lostCount: rows.filter((row) => row.status === 'lost').length,
    dailyBreakdown: [...daily].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count, label: date, shortLabel: date.slice(5) })),
    unavailable: ['payments'],
  };
}

// Keep login IDs in staff controls while retaining workforce branch membership.
export async function getTenantStaff() {
  const users = [];
  let offset = 0;
  while (true) {
    let page;
    try {
      page = await api.get('/tenant/employees/', { params: { limit: 200, offset } });
    } catch (error) {
      if (error.response?.status === 403) return [];
      throw error;
    }
    const employees = page.results || [];
    users.push(...employees.filter((employee) => employee.user_id && employee.employment_status !== 'terminated').map((employee) => ({
      ...employee, employee_id: employee.id, id: employee.user_id,
      branches: employee.primary_branch_id ? [employee.primary_branch_id] : [],
    })));
    offset += employees.length;
    if (!employees.length || offset >= page.count) break;
  }
  return users;
}
