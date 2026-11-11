/** The Ply mark: two overlapping sheets, the front one carrying two lines of a note. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="10" y="2" width="20" height="20" rx="6" fill="#DBEAFE" />
      <rect x="2" y="10" width="20" height="20" rx="6" fill="#2563EB" />
      <rect x="7" y="16.5" width="10" height="2.5" rx="1.25" fill="#FFFFFF" />
      <rect x="7" y="21.5" width="6" height="2.5" rx="1.25" fill="#BFDBFE" />
    </svg>
  );
}
