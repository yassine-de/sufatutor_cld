// Plays a lesson video. Bunny Stream links are embedded; direct HTTPS files use the browser player.
// Anything else is not rendered, so an admin typo cannot embed arbitrary pages.
const BUNNY_EMBED = /^https:\/\/(iframe|player)\.mediadelivery\.net\//;

export function VideoPlayer({ url, title }: { url: string; title: string }) {
  const frame = "aspect-video w-full overflow-hidden rounded-2xl border border-line bg-black";

  if (BUNNY_EMBED.test(url)) {
    return (
      <iframe
        src={url}
        title={title}
        loading="lazy"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        className={frame}
      />
    );
  }
  if (/^https:\/\/.+\.(mp4|webm)(\?.*)?$/i.test(url)) {
    return <video src={url} title={title} controls playsInline preload="metadata" className={frame} />;
  }
  return null;
}
