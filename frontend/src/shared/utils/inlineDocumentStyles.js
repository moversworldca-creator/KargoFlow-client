// Document HTML must render without a Tailwind stylesheet in previews and PDFs.
// Convert the utility classes used by builder blocks into portable inline CSS.
const UTILITY_STYLES = {
  flex: 'display:flex', grid: 'display:grid', hidden: 'display:none', block: 'display:block', 'inline-block': 'display:inline-block',
  'flex-col': 'flex-direction:column', 'flex-wrap': 'flex-wrap:wrap', 'flex-1': 'flex:1 1 0%', 'shrink-0': 'flex-shrink:0',
  'items-start': 'align-items:flex-start', 'items-end': 'align-items:flex-end', 'items-center': 'align-items:center',
  'justify-between': 'justify-content:space-between', 'justify-end': 'justify-content:flex-end', 'justify-center': 'justify-content:center',
  'text-left': 'text-align:left', 'text-right': 'text-align:right', 'text-center': 'text-align:center',
  relative: 'position:relative', absolute: 'position:absolute', 'w-full': 'width:100%', 'w-20': 'width:5rem', 'w-32': 'width:8rem',
  'grid-cols-1': 'grid-template-columns:repeat(1,minmax(0,1fr))', 'grid-cols-2': 'grid-template-columns:repeat(2,minmax(0,1fr))', 'grid-cols-3': 'grid-template-columns:repeat(3,minmax(0,1fr))',
  'gap-2': 'gap:.5rem', 'gap-4': 'gap:1rem', 'gap-6': 'gap:1.5rem',
  'p-0': 'padding:0', 'p-2': 'padding:.5rem', 'p-2.5': 'padding:.625rem', 'p-3': 'padding:.75rem', 'p-4': 'padding:1rem', 'p-5': 'padding:1.25rem', 'p-6': 'padding:1.5rem', 'p-8': 'padding:2rem',
  'px-1': 'padding-left:.25rem;padding-right:.25rem', 'px-2': 'padding-left:.5rem;padding-right:.5rem', 'px-4': 'padding-left:1rem;padding-right:1rem', 'py-2': 'padding-top:.5rem;padding-bottom:.5rem',
  'pb-1': 'padding-bottom:.25rem', 'pb-2': 'padding-bottom:.5rem', 'pb-6': 'padding-bottom:1.5rem', 'mt-1': 'margin-top:.25rem', 'mt-2': 'margin-top:.5rem', 'mb-1': 'margin-bottom:.25rem', 'mb-2': 'margin-bottom:.5rem', 'mb-3': 'margin-bottom:.75rem', 'mb-4': 'margin-bottom:1rem', 'mb-6': 'margin-bottom:1.5rem', 'mb-8': 'margin-bottom:2rem', 'mb-10': 'margin-bottom:2.5rem', 'm-0': 'margin:0',
  border: 'border:1px solid #e5e7eb', 'border-2': 'border:2px solid #e5e7eb', 'border-b': 'border-bottom:1px solid #e5e7eb', 'border-b-2': 'border-bottom:2px solid #e5e7eb', 'border-b-4': 'border-bottom:4px solid #e5e7eb', 'border-l': 'border-left:1px solid #e5e7eb', 'border-black': 'border-color:#000', 'border-gray-50': 'border-color:#f9fafb', 'border-gray-100': 'border-color:#f3f4f6', 'border-gray-200': 'border-color:#e5e7eb', 'border-gray-300': 'border-color:#d1d5db', 'border-gray-500': 'border-color:#6b7280',
  'bg-white': 'background-color:#fff', 'bg-black': 'background-color:#000', 'bg-gray-50': 'background-color:#f9fafb', 'bg-gray-100': 'background-color:#f3f4f6', 'bg-gray-200': 'background-color:#e5e7eb',
  'text-black': 'color:#000', 'text-white': 'color:#fff', 'text-gray-400': 'color:#9ca3af', 'text-gray-500': 'color:#6b7280', 'text-gray-600': 'color:#4b5563', 'text-gray-700': 'color:#374151', 'text-gray-800': 'color:#1f2937',
  'font-sans': 'font-family:Arial,Helvetica,sans-serif', 'font-mono': 'font-family:monospace', 'font-medium': 'font-weight:500', 'font-semibold': 'font-weight:600', 'font-bold': 'font-weight:700', 'font-black': 'font-weight:900', uppercase: 'text-transform:uppercase', italic: 'font-style:italic',
  'text-xs': 'font-size:12px', 'text-sm': 'font-size:14px', 'text-base': 'font-size:16px', 'text-xl': 'font-size:20px', 'text-2xl': 'font-size:24px', 'text-3xl': 'font-size:30px', 'leading-relaxed': 'line-height:1.625', 'tracking-tight': 'letter-spacing:-.025em', 'tracking-tighter': 'letter-spacing:-.05em', 'tracking-wide': 'letter-spacing:.025em', 'tracking-wider': 'letter-spacing:.05em', 'tracking-widest': 'letter-spacing:.1em',
  'text-[9px]': 'font-size:9px', 'text-[10px]': 'font-size:10px',
  // PDFs are desktop documents, so responsive desktop variants are made explicit.
  'sm:block': 'display:block', 'sm:flex': 'display:flex', 'sm:flex-row': 'flex-direction:row', 'md:flex-row': 'flex-direction:row', 'md:items-end': 'align-items:flex-end', 'md:text-right': 'text-align:right', 'md:w-auto': 'width:auto', 'md:grid-cols-2': 'grid-template-columns:repeat(2,minmax(0,1fr))', 'md:grid-cols-3': 'grid-template-columns:repeat(3,minmax(0,1fr))', 'md:text-2xl': 'font-size:24px', 'md:text-3xl': 'font-size:30px',
};

// Legacy templates are normalized on entry; new document HTML is self-contained.
function utilityStyle(name) {
  name = name.replace(/^(sm|md):/, '');
  if (UTILITY_STYLES[name]) return UTILITY_STYLES[name];
  const extra = {
    'flex-row': 'flex-direction:row', 'w-auto': 'width:auto',
    'object-contain': 'object-fit:contain', grayscale: 'filter:grayscale(1)',
    'border-collapse': 'border-collapse:collapse', 'break-all': 'word-break:break-all',
    'border-t': 'border-top:1px solid #e5e7eb', 'border-t-2': 'border-top:2px solid #e5e7eb',
    'border-dashed': 'border-style:dashed', 'border-solid': 'border-style:solid',
    'border-white': 'border-color:#fff', 'border-l-gray-300': 'border-left-color:#d1d5db',
    'border-y-transparent': 'border-top-color:transparent;border-bottom-color:transparent',
    'left-1/2': 'left:50%', '-translate-x-1/2': 'transform:translateX(-50%)',
    'overflow-x-auto': 'overflow-x:auto', 'overflow-y-auto': 'overflow-y:auto',
    'text-slate-400': 'color:#94a3b8',
  };
  if (extra[name]) return extra[name];
  const match = name.match(/^(-?)(p[xytrbl]?|m[xytrbl]?|gap|w|max-w|max-h|min-w|top|left|right|text|border-l|border-y)-(?:\[(-?[\d.]+px)\]|([\d.]+))$/);
  if (!match) return '';
  const [, negative, prefix, pixels, units] = match;
  const value = `${negative}${pixels || `${Number(units) * .25}rem`}`;
  const props = { p: ['padding'], m: ['margin'], gap: ['gap'], w: ['width'], 'max-w': ['max-width'], 'max-h': ['max-height'], 'min-w': ['min-width'], top: ['top'], left: ['left'], right: ['right'], text: ['font-size'], 'border-l': ['border-left-width'], 'border-y': ['border-top-width', 'border-bottom-width'] };
  const axes = { x: ['left', 'right'], y: ['top', 'bottom'], t: ['top'], r: ['right'], b: ['bottom'], l: ['left'] };
  const properties = props[prefix] || axes[prefix[1]]?.map(side => `${prefix[0] === 'p' ? 'padding' : 'margin'}-${side}`) || [];
  return properties.map(prop => `${prop}:${value}`).join(';');
}

export function inlineDocumentBuilderStyles(html) {
  if (typeof document === 'undefined' || !html) return String(html || '');
  const holder = document.createElement('template');
  holder.innerHTML = String(html);
  holder.content.querySelectorAll('[class]').forEach((element) => {
    // Responsive document variants take precedence independent of class order.
    const classes = [...element.classList].sort((a, b) => Number(/^(sm|md):/.test(a)) - Number(/^(sm|md):/.test(b)));
    const styles = classes.map(utilityStyle).filter(Boolean);
    const original = element.getAttribute('style') || '';
    if (styles.length) element.setAttribute('style', `${styles.join(';')};${original}`);
    Array.from(element.children).slice(1).forEach(child => {
      const childStyles = [];
      if (classes.includes('divide-x')) childStyles.push(`border-left:1px solid ${classes.includes('divide-black') ? '#000' : '#e5e7eb'}`);
      if (classes.includes('divide-y')) childStyles.push('border-top:1px solid #e5e7eb');
      classes.forEach(name => { const match = name.match(/^space-y-([\d.]+)$/); if (match) childStyles.push(`margin-top:${Number(match[1]) * .25}rem`); });
      if (childStyles.length) child.setAttribute('style', `${childStyles.join(';')};${child.getAttribute('style') || ''}`);
    });
    if (classes.includes('print-expand')) {
      element.style.maxHeight = 'none';
      element.style.overflow = 'visible';
    }
    element.removeAttribute('class');
  });
  return holder.innerHTML;
}
