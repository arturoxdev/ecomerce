import { isVideoUrl } from "@/lib/services/media";

type Props = {
  mediaUrl: string;
};

export function HeroMedia({ mediaUrl }: Props) {
  if (isVideoUrl(mediaUrl)) {
    return (
      <video
        src={mediaUrl}
        className="h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
      />
    );
  }

  return (
    <div
      className="h-full w-full bg-cover bg-center"
      style={{ backgroundImage: `url('${mediaUrl}')` }}
    />
  );
}
