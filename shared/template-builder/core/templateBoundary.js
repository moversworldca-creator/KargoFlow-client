export function isTemplateForMode(document, mode) {
  const normalize = (value) => value === 'estimate_portal' ? 'estimate' : value;
  return Boolean(document?.mode) && normalize(document.mode) === normalize(mode);
}

export function isBuilderDocumentMode(mode) {
  return !['email', 'sms'].includes(mode);
}
