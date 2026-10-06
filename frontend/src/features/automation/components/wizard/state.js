export const initialDraft = () => ({
  meta: { id: null, name: '', target_type: 'lead', is_active: true },
  trigger: { type: 'change', params: { event: 'create' } },
  steps: [
    { step_type: 'send_email', config: { template_id: '', require_email: true, attachments: [] }, run_once: false, is_active: true },
  ],
  recipients: {
    mode: 'lead_contacts_or_custom',
    tokens: ['contact1'],
    custom_emails: [],
    custom_phones: [],
  },
  filters: { match: 'all', rules: [] },
});

export function reducer(state, action) {
  switch (action.type) {
    case 'reset':
      return initialDraft();
    case 'load':
      return action.value;
    case 'meta':
      return { ...state, meta: { ...state.meta, ...action.patch } };
    case 'trigger':
      return { ...state, trigger: { ...state.trigger, ...action.patch } };
    case 'triggerParams':
      return { ...state, trigger: { ...state.trigger, params: { ...(state.trigger.params || {}), ...action.patch } } };
    case 'stepsSet':
      return { ...state, steps: action.value };
    case 'stepsAdd':
      return { ...state, steps: [...(state.steps || []), action.value] };
    case 'stepsUpdate': {
      const next = [...(state.steps || [])];
      next[action.index] = { ...(next[action.index] || {}), ...action.patch };
      return { ...state, steps: next };
    }
    case 'stepsUpdateConfig': {
      const next = [...(state.steps || [])];
      const cur = next[action.index] || {};
      next[action.index] = { ...cur, config: { ...(cur.config || {}), ...action.patch } };
      return { ...state, steps: next };
    }
    case 'stepsRemove':
      return { ...state, steps: (state.steps || []).filter((_, i) => i !== action.index) };
    case 'stepsMove': {
      const next = [...(state.steps || [])];
      const from = action.from;
      const to = action.to;
      if (from < 0 || to < 0 || from >= next.length || to >= next.length) return state;
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return { ...state, steps: next };
    }
    case 'recipients':
      return { ...state, recipients: { ...state.recipients, ...action.patch } };
    case 'filters':
      return { ...state, filters: action.value };
    default:
      return state;
  }
}

export const stepLabels = ['Trigger', 'Action', 'Target', 'Filters'];
