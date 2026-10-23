const TEMPLATE_ROUTES = {
  document: '/document-templates',
  estimate_portal: '/estimate-portal-templates',
  invoice: '/invoice-templates',
  communication: '/communication-templates',
};

export function getTemplateRoute(kind, id) {
  const base = TEMPLATE_ROUTES[kind];
  if (!base) throw new Error('Unsupported template kind.');
  return id == null ? base : `${base}/${id}/builder`;
}
