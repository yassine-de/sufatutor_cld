// 0..3 stars. The visual stars are decorative; the label is what screen readers announce.
export function Stars({ count, max = 3, size = 20, label }: { count: number; max?: number; size?: number; label: string }) {
  return (
    <span role="img" aria-label={label} className="inline-flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
          <path
            d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z"
            fill={i < count ? "#f5b301" : "none"}
            stroke={i < count ? "#d99a00" : "currentColor"}
            strokeWidth="1.6"
            strokeLinejoin="round"
            opacity={i < count ? 1 : 0.35}
          />
        </svg>
      ))}
    </span>
  );
}
