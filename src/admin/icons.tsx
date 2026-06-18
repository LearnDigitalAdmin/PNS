export const ICONS = {
  edit: (
    <svg className="icon" viewBox="0 0 24 24">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4Z" />
    </svg>
  ),
  trash: (
    <svg className="icon" viewBox="0 0 24 24">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  ),
  eye: (
    <svg className="icon" viewBox="0 0 24 24">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  check: (
    <svg className="icon" viewBox="0 0 24 24">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  x: (
    <svg className="icon" viewBox="0 0 24 24">
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </svg>
  ),
  crown: (
    <svg className="icon" viewBox="0 0 24 24">
      <path d="m2 17 2-9 4 4 4-7 4 7 4-4 2 9Z" />
      <path d="M4 21h16" />
    </svg>
  ),
  arrow: (
    <svg className="icon" viewBox="0 0 24 24">
      <path d="M5 12h14" />
      <path d="m13 5 7 7-7 7" />
    </svg>
  ),
  up: (
    <svg className="icon" viewBox="0 0 24 24">
      <path d="m18 15-6-6-6 6" />
    </svg>
  ),
  down: (
    <svg className="icon" viewBox="0 0 24 24">
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  mail: (
    <svg className="icon" viewBox="0 0 24 24">
      <path d="M4 4h16v16H4Z" />
      <path d="m4 6 8 7 8-7" />
    </svg>
  ),
};

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="panel text-center" style={{ gridColumn: '1/-1' }}>
      <p style={{ fontSize: '.8rem', color: 'var(--warm-gray)' }}>{message}</p>
    </div>
  );
}
