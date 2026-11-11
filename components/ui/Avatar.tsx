type Size = "sm" | "md" | "lg";

const sizes: Record<Size, string> = {
  sm: "size-6 text-[10px]",
  md: "size-10 text-meta",
  lg: "size-16 text-section",
};

/** A few tints from the blue family, so people look slightly different but on-brand. */
const tints = [
  "bg-primary-light text-primary-hover",
  "bg-sky-100 text-sky-800",
  "bg-indigo-100 text-indigo-800",
  "bg-cyan-100 text-cyan-800",
];

export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0].charAt(0);
  const last = words.length > 1 ? words[words.length - 1].charAt(0) : "";
  return (first + last).toUpperCase();
}

/** The same name always gets the same tint. */
function tintFor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return tints[hash % tints.length];
}

interface AvatarProps {
  name: string;
  size?: Size;
  /** Shows a filled blue dot: "you have notes on this person". */
  hasNotes?: boolean;
  className?: string;
}

export function Avatar({
  name,
  size = "md",
  hasNotes = false,
  className = "",
}: AvatarProps) {
  return (
    <span
      className={`relative inline-flex shrink-0 ${className}`}
      title={hasNotes ? `${name} (you have notes)` : name}
    >
      <span
        aria-hidden="true"
        className={`inline-flex items-center justify-center rounded-full font-semibold ring-2 ring-white ${sizes[size]} ${tintFor(name)}`}
      >
        {initialsOf(name)}
      </span>
      {hasNotes && (
        <span
          aria-hidden="true"
          className={`bg-primary absolute -right-0.5 -bottom-0.5 rounded-full ring-2 ring-white ${size === "sm" ? "size-2" : "size-3"}`}
        />
      )}
      <span className="sr-only">
        {name}
        {hasNotes ? ", you have notes" : ""}
      </span>
    </span>
  );
}
