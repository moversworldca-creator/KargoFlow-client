import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import NotesRichTextEditor from './NotesRichTextEditor';

describe('Notes rich text editor', () => {
  it('sanitizes stored notes before placing them in the editor', () => {
    const { container } = render(
      <NotesRichTextEditor
        value={'<p>Keep this</p><img src="x" onerror="window.__notesXss = true"><script>window.__notesXss = true</script>'}
        onChange={vi.fn()}
      />,
    );
    const editor = container.querySelector('[contenteditable]');
    expect(editor.innerHTML).toContain('<p>Keep this</p>');
    expect(editor.innerHTML).not.toContain('onerror');
    expect(editor.innerHTML).not.toContain('<script');
  });
});
