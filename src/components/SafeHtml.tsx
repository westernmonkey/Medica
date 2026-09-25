"use client";

import createDOMPurify from "dompurify";
import { useSyncExternalStore } from "react";

const subscribeNoop = () => () => {};
let purifier: ReturnType<typeof createDOMPurify> | null = null;

function sanitize(html: string | null): string {
  if (!html) return "";
  purifier ??= createDOMPurify(window);
  return purifier.sanitize(html);
}

export function SafeHtml({ html }: { html: string | null }) {
  const safeHtml = useSyncExternalStore(
    subscribeNoop,
    () => sanitize(html),
    () => "",
  );

  if (!safeHtml) return null;
  return <span dangerouslySetInnerHTML={{ __html: safeHtml }} />;
}

export function SafeImage({ src, alt = "", className }: { src: string | null; alt?: string; className?: string }) {
  if (!src) return null;
  const imageSource = src.trim();
  const isLocal = imageSource.startsWith("/") && !imageSource.startsWith("//");
  const isEmbeddedImage = /^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z0-9+/]+=*$/i.test(imageSource);
  let isWeb = false;
  try {
    const url = new URL(imageSource);
    isWeb = url.protocol === "https:" || url.protocol === "http:";
  } catch {
    isWeb = false;
  }
  if (!isLocal && !isWeb && !isEmbeddedImage) return null;
  // Question images are hosted across domains, so Next's fixed image allowlist cannot cover them.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={imageSource} alt={alt} className={className} loading="lazy" />;
}
