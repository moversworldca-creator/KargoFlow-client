export function getTenantTemplateKind(template) {
  if (template.kind) {
    const kind = template.kind === 'estimate' ? 'estimate_portal' : template.kind;
    if (['document', 'invoice', 'estimate_portal', 'communication'].includes(kind)) return kind;
    throw new Error('Unsupported template kind.');
  }
  if (template.source_type === 'estimate') return 'estimate_portal';
  if (template.source_type === 'comm' || template.channel) return 'communication';
  if (template.scope_type === 'invoice' || ['invoice', 'payment_receipt'].includes(template.template_type)) return 'invoice';
  return 'document';
}

export function getTenantTemplateMode(template) {
  const kind = getTenantTemplateKind(template);
  if (kind === 'estimate_portal') return 'estimate';
  if (kind === 'invoice') return 'invoice';
  const subtype = template.subtype || template.template_type;
  if (kind === 'communication') {
    const channel = template.channel || subtype;
    if (!['email', 'sms'].includes(channel)) throw new Error('Unsupported message template type.');
    return channel;
  }
  if (subtype === 'bol') return 'bol';
  if (['cc_authorization', 'credit_card_authorization', 'cc_auth'].includes(subtype)) return 'cc_auth';
  return 'contract';
}

export function getTenantTemplateRoute(basePath, kind, id) {
  const sections = { document: 'document-templates', invoice: 'invoice-templates', estimate_portal: 'estimate-portal-templates', communication: 'communication-templates' };
  if (!sections[kind]) throw new Error('Unsupported template kind.');
  const base = basePath.replace(/\/(document-templates|invoice-templates|estimate-portal-templates|communication-templates).*$/, `/${sections[kind]}`);
  return id == null ? base : `${base}/${id}/builder`;
}
