// Round profile picture: the child's own photo if there is one, else the chosen avatar character,
// else the first letter of the name. Plain <img> on purpose: the avatars are small static SVGs and
// photos are short-lived signed URLs, so the image optimizer would add nothing.
type Props = {
  name: string;
  avatarPath?: string | null;
  photoSrc?: string | null;
  size?: number;
  alt?: string;
};

export function ChildAvatar({ name, avatarPath, photoSrc, size = 96, alt = "" }: Props) {
  const src = photoSrc ?? avatarPath;
  const style = { width: size, height: size };

  if (!src) {
    return (
      <span
        aria-hidden={alt === "" ? true : undefined}
        style={{ ...style, fontSize: size * 0.45 }}
        className="inline-flex items-center justify-center rounded-full bg-brand-soft font-extrabold text-brand"
      >
        {[...name.trim()][0]?.toUpperCase()}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} style={style} className="rounded-full bg-brand-soft object-cover" />;
}
