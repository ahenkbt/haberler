/** HM editör / haber sitesi Video TV markası — şeffaf zemin, alanı doldurur */
export function VideoTvBrandLogo({
  className = "yt-hm-brand-logo block h-10 w-full max-w-full bg-transparent object-contain object-left",
  alt = "Video TV",
}: {
  className?: string;
  alt?: string;
}) {
  return <img src="/yektube-video-tv-logo.png" alt={alt} className={className} draggable={false} />;
}
