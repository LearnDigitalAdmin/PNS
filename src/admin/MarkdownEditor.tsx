import { useRef, useState, useCallback } from 'react';
import { renderMarkdown } from '../lib/markdown';

// ~100,000 characters (~100KB worst-case) — a feature-length magazine story
// is rarely more than 1,500 words (~10KB). This leaves enormous headroom
// under Firestore's 1MB per-document limit even with all the other story
// fields (title, image URL, author, etc.) included.
export const MAX_STORY_BODY_LENGTH = 100_000;

interface MarkdownEditorProps {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}

type ToolbarAction =
  | { kind: 'wrap'; before: string; after: string }
  | { kind: 'linePrefix'; prefix: string }
  | { kind: 'insert'; text: string };

const TOOLBAR_BUTTONS: { label: string; title: string; action: ToolbarAction }[] = [
  { label: 'B', title: 'Bold', action: { kind: 'wrap', before: '**', after: '**' } },
  { label: 'I', title: 'Italic', action: { kind: 'wrap', before: '_', after: '_' } },
  { label: 'H2', title: 'Heading', action: { kind: 'linePrefix', prefix: '## ' } },
  { label: 'H3', title: 'Subheading', action: { kind: 'linePrefix', prefix: '### ' } },
  { label: '❝', title: 'Quote', action: { kind: 'linePrefix', prefix: '> ' } },
  { label: '•', title: 'Bullet list', action: { kind: 'linePrefix', prefix: '- ' } },
  { label: '1.', title: 'Numbered list', action: { kind: 'linePrefix', prefix: '1. ' } },
  { label: '🔗', title: 'Link', action: { kind: 'wrap', before: '[', after: '](https://)' } },
  { label: '―', title: 'Divider', action: { kind: 'insert', text: '\n\n---\n\n' } },
];

export function MarkdownEditor({ value, onChange, rows = 8, placeholder }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<'write' | 'preview'>('write');

  const applyAction = useCallback(
    (action: ToolbarAction) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const before = value.slice(0, start);
      const selected = value.slice(start, end);
      const after = value.slice(end);

      let next = value;
      let cursorStart = start;
      let cursorEnd = end;

      if (action.kind === 'wrap') {
        next = before + action.before + selected + action.after + after;
        cursorStart = start + action.before.length;
        cursorEnd = cursorStart + selected.length;
      } else if (action.kind === 'linePrefix') {
        const lineStart = before.lastIndexOf('\n') + 1;
        next = value.slice(0, lineStart) + action.prefix + value.slice(lineStart);
        cursorStart = start + action.prefix.length;
        cursorEnd = end + action.prefix.length;
      } else if (action.kind === 'insert') {
        next = before + action.text + after;
        cursorStart = cursorEnd = start + action.text.length;
      }

      if (next.length > MAX_STORY_BODY_LENGTH) return;
      onChange(next);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          ta.focus();
          ta.setSelectionRange(cursorStart, cursorEnd);
        });
      });
    },
    [value, onChange]
  );

  const remaining = MAX_STORY_BODY_LENGTH - value.length;
  const nearLimit = remaining < MAX_STORY_BODY_LENGTH * 0.05;

  return (
    <div className="md-editor">
      <div className="md-editor-toolbar">
        <div className="flex gap-1 flex-wrap">
          {TOOLBAR_BUTTONS.map((b) => (
            <button
              key={b.title}
              type="button"
              className="md-editor-btn"
              title={b.title}
              onClick={() => applyAction(b.action)}
              disabled={mode === 'preview'}
            >
              {b.label}
            </button>
          ))}
        </div>
        <div className="md-editor-tabs">
          <button
            type="button"
            className={`md-editor-tab ${mode === 'write' ? 'active' : ''}`}
            onClick={() => setMode('write')}
          >
            Write
          </button>
          <button
            type="button"
            className={`md-editor-tab ${mode === 'preview' ? 'active' : ''}`}
            onClick={() => setMode('preview')}
          >
            Preview
          </button>
        </div>
      </div>

      {mode === 'write' ? (
        <textarea
          ref={textareaRef}
          className="form-input-admin md-editor-textarea"
          rows={rows}
          placeholder={placeholder}
          value={value}
          maxLength={MAX_STORY_BODY_LENGTH}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <div
          className="md-editor-preview md-content"
          dangerouslySetInnerHTML={{
            __html: renderMarkdown(value) || '<p style="opacity:.5">Nothing to preview yet…</p>',
          }}
        />
      )}

      <div className="md-editor-footer">
        <span style={{ fontSize: '.62rem', color: 'var(--warm-gray)' }}>
          Markdown supported — bold, italic, headings, lists, quotes, links. No need to type symbols by hand, use the toolbar.
        </span>
        <span style={{ fontSize: '.62rem', color: nearLimit ? 'var(--danger)' : 'var(--warm-gray)' }}>
          {value.length.toLocaleString()} / {MAX_STORY_BODY_LENGTH.toLocaleString()}
        </span>
      </div>
    </div>
  );
}