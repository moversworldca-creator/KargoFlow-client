// Keep the API block document and legacy HTML templates compatible.
export const getDocumentContent = (draft) => draft.content ?? draft.html_content ?? '';

export const getDocumentHtml = (draft) => {
  const content = getDocumentContent(draft);
  if (typeof content === 'string') return content;
  return (content?.blocks || []).map((block) => block.html || '').join('\n');
};
