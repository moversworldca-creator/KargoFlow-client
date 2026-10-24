import api from '../../../services/axios';

export function recordWorkBase(target = {}) {
  const opportunity = target.opportunity ?? target.opportunity_id;
  const lead = target.lead ?? target.lead_id;
  const id = opportunity || lead;
  if (!id) throw new Error('A parent lead or opportunity is required.');
  return `/tenant/${opportunity ? 'opportunities' : 'leads'}/${id}/`;
}
export function activityPayload(data) {
  return Object.fromEntries(['activity_type', 'subject', 'description', 'direction', 'status', 'is_pinned']
    .filter((key) => data[key] !== undefined).map((key) => [key, data[key]]));
}
export function taskPayload(data) {
  const values = { ...data, title: data.title ?? data.subject, assigned_to_id: data.assigned_to_id ?? data.assigned_to };
  return Object.fromEntries(['title', 'notes', 'due_date', 'assigned_to_id', 'task_type', 'status']
    .filter((key) => values[key] !== undefined).map((key) => [key, values[key]]));
}
export async function recordActivities(params) {
  const response = await api.get(`${recordWorkBase(params)}activities/`);
  const rows = Array.isArray(response) ? response : response.results || [];
  const offset = Number(params.offset || 0);
  return rows.slice(offset, offset + Number(params.limit || rows.length)).map((row) => {
    if (!params.lead || row.activity_type !== 'call') return row;
    const description = row.description || '';
    const duration = description.match(/Duration:\s*([\d.]+)/i);
    const disposition = description.match(/Disposition:\s*([^|\n]+)/i);
    return { ...row, call_log_details: { id: row.id, duration_seconds: duration ? Number(duration[1]) * 60 : 0, disposition: disposition?.[1]?.trim() || 'connected' } };
  });
}
export async function recordTasks(params) {
  const response = await api.get(`${recordWorkBase(params)}tasks/`);
  const rows = Array.isArray(response) ? response : response.results || [];
  return rows.filter((task) => !params.status || task.status === params.status).map((task) => ({
    ...task, assigned_to: task.assigned_to_id, activity: task.activity_id,
    activity_details: { id: task.activity_id, subject: task.title, description: task.notes, status: task.status },
  })).sort((a, b) => String(b.due_date || '').localeCompare(String(a.due_date || '')));
}
export const createRecordActivity = (data) => api.post(`${recordWorkBase(data)}activities/`, activityPayload(data));
export const updateRecordActivity = (id, data, target) => api.patch(`${recordWorkBase(target)}activities/${id}/`, activityPayload(data));
export const createRecordTask = (data) => api.post(`${recordWorkBase(data)}tasks/`, taskPayload(data));
export const updateRecordTask = (id, data, target) => api.patch(`${recordWorkBase(target)}tasks/${id}/`, taskPayload(data));
