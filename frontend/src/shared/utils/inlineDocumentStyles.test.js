import { describe, expect, it } from 'vitest';
import { inlineDocumentBuilderStyles } from './inlineDocumentStyles';

const parse = (html) => {
  const holder = document.createElement('div');
  holder.innerHTML = inlineDocumentBuilderStyles(html);
  return holder.firstElementChild;
};

describe('portable document styles', () => {
  it('preserves custom formatting over utilities and is idempotent', () => {
    const html = '<p class="text-sm font-bold" style="font-size:22px">{{Customer.full_name}}</p>';
    const element = parse(html);
    expect(element.style.fontSize).toBe('22px');
    expect(element.style.fontWeight).toBe('700');
    expect(element.hasAttribute('class')).toBe(false);
    const converted = inlineDocumentBuilderStyles(html);
    expect(inlineDocumentBuilderStyles(converted)).toBe(converted);
    expect(converted).toContain('{{Customer.full_name}}');
  });
  it('keeps logos visible with explicit size limits', () => {
    const element = parse('<img class="sm:block hidden max-h-12 md:max-h-16 max-w-[150px] object-contain">');
    expect(element.style.display).toBe('block');
    expect(element.style.maxHeight).toBe('4rem');
    expect(element.style.maxWidth).toBe('150px');
  });
  it('preserves child spacing and expands printable terms', () => {
    const element = parse('<div class="space-y-6 divide-x divide-black"><p>A</p><p class="print-expand max-h-[140px] overflow-y-auto">Terms</p></div>');
    expect(element.children[1].style.marginTop).toBe('1.5rem');
    expect(element.children[1].style.borderLeftWidth).toBe('1px');
    expect(element.children[1].style.maxHeight).toBe('none');
  });
});
