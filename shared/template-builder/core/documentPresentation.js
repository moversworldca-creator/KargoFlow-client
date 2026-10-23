const DEFAULT_FONT = 'Inter, system-ui, sans-serif';

export function getDocumentSurfaceStyle(settings = {}) {
  const margins = settings.margins || {};
  const margin = (side) => {
    const value = Number(margins[side] ?? 40);
    return Number.isFinite(value) && value >= 0 ? value : 40;
  };
  const fontSize = Number(settings.fontSize);
  return {
    fontFamily: typeof settings.fontFamily === 'string' && /^[A-Za-z0-9 _,"'-]{1,120}$/.test(settings.fontFamily)
      ? settings.fontFamily : DEFAULT_FONT,
    fontSize: Number.isFinite(fontSize) && fontSize >= 7 && fontSize <= 72 ? `${fontSize}px` : undefined,
    paddingTop: margin('top'),
    paddingRight: margin('right'),
    paddingBottom: margin('bottom'),
    paddingLeft: margin('left'),
  };
}
