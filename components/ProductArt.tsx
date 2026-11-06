import { gradientFor } from "@/lib/utils";

export function ProductArt({
  name,
  image,
  className = "",
}: {
  name: string;
  image?: string | null;
  className?: string;
}) {
  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className={`h-full w-full object-cover ${className}`}
        loading="lazy"
      />
    );
  }

  const [from, to] = gradientFor(name);
  const initials = name
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className={`relative flex h-full w-full items-center justify-center overflow-hidden ${className}`}
      style={{ background: `linear-gradient(140deg, ${from} 0%, ${to} 100%)` }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(circle at 28% 18%, rgba(255,255,255,.65) 0%, transparent 44%)",
        }}
      />
      <div className="absolute -right-1/4 -bottom-1/4 h-2/3 w-2/3 rounded-full border border-white/30" />
      <span className="relative select-none font-display text-4xl font-semibold tracking-tight text-ink/45">
        {initials}
      </span>
    </div>
  );
}
