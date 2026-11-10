"use client";

import { useState } from "react";

// A photo that says so plainly when this device cannot draw it, instead of the
// browser's own broken-image icon (a small question mark). The usual cause is
// an iPhone photo kept in Apple's HEIC format, which only Apple devices can
// show: it is still saved, and the link opens or downloads the original.
export function SafeImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [broken, setBroken] = useState(false);

  if (broken) {
    return (
      <a
        href={src}
        target="_blank"
        rel="noreferrer"
        className={`flex flex-col items-center justify-center gap-1 bg-zinc-100 px-2 text-center text-xs text-zinc-600 ${className ?? ""}`}
      >
        <span>Photo saved</span>
        <span className="underline underline-offset-2">This device cannot show it. Open it</span>
      </a>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} onError={() => setBroken(true)} />;
}
