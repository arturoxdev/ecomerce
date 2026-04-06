"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef } from "react";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel";
import { isVideoUrl } from "@/features/media";

type ProductGalleryProps = {
  photos: string[];
  productName: string;
};

export function ProductGallery({ photos, productName }: ProductGalleryProps) {
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const apiRef = useRef<CarouselApi>(undefined);

  const pauseAllVideos = useCallback(() => {
    videoRefs.current.forEach((video) => {
      video.pause();
    });
  }, []);

  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;

    const onSelect = () => {
      pauseAllVideos();
    };

    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [pauseAllVideos]);

  return (
    <Carousel
      opts={{ loop: true }}
      className="w-full"
      setApi={(api) => {
        apiRef.current = api;
      }}
    >
      <CarouselContent>
        {photos.map((photo, index) => (
          <CarouselItem key={index}>
            <div className="aspect-[4/3] overflow-hidden rounded-xl bg-slate-100">
              {isVideoUrl(photo) ? (
                <video
                  ref={(el) => {
                    if (el) videoRefs.current.set(index, el);
                    else videoRefs.current.delete(index);
                  }}
                  src={photo}
                  controls
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-cover"
                />
              ) : (
                <Image
                  src={photo}
                  alt={`${productName} — photo ${index + 1}`}
                  width={800}
                  height={600}
                  className="h-full w-full object-cover"
                  priority={index === 0}
                />
              )}
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="-left-4 sm:left-2" />
      <CarouselNext className="-right-4 sm:right-2" />
    </Carousel>
  );
}
