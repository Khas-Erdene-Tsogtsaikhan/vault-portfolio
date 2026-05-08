"use client";

import Image from "next/image";
import { ImageOff } from "lucide-react";
import { useEffect, useState } from "react";

export function isDisplayableImage(url?: string) {
  if (!url) return false;
  const normalized = normalizeLegacyShareImageUrl(url);
  if (!normalized) return false;
  const clean = normalized.split("?")[0].toLowerCase();
  return !clean.endsWith(".heic") && !clean.endsWith(".heif");
}

export function AssetImage({ src, alt, fill = true, sizes = "100vw", className = "object-cover", priority = false }: { src?: string; alt: string; fill?: boolean; sizes?: string; className?: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  const imageSrc = normalizeLegacyShareImageUrl(src);

  useEffect(() => {
    setFailed(false);
  }, [imageSrc]);

  if (!isDisplayableImage(imageSrc)) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-vault-black text-center text-vault-muted">
        <ImageOff size={24} className="text-vault-gold" />
        <span className="px-3 text-xs leading-5">{src ? "Image preview unavailable. Upload JPG, PNG, or WebP for preview." : "Image preview pending."}</span>
      </div>
    );
  }

  if (failed) return <ImageFallback />;

  if (usesPlainImage(imageSrc)) {
    const sizingClass = fill ? "h-full w-full" : "";
    // Dynamic market proxy images and some remote collector images are safer outside Next's optimizer.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageSrc as string} alt={alt} className={`${sizingClass} ${className}`} onError={() => setFailed(true)} />;
  }

  return <Image src={imageSrc as string} alt={alt} fill={fill} priority={priority} sizes={sizes} className={className} unoptimized={imageSrc?.includes("supabase.co/storage")} onError={() => setFailed(true)} />;
}

function usesPlainImage(src?: string) {
  return Boolean(
    src?.startsWith("/api/market/image")
    || src?.includes("/api/market/image")
    || src?.includes("images.pricecharting.com")
    || src?.includes("pricecharting.com")
  );
}

function normalizeLegacyShareImageUrl(src?: string) {
  if (!src || !src.includes("/api/share/image")) return src;
  const query = src.split("?")[1];
  if (!query) return undefined;
  const original = new URLSearchParams(query).get("url");
  return original ? decodeURIComponent(original) : undefined;
}

function ImageFallback() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-vault-black text-center text-vault-muted">
      <ImageOff size={24} className="text-vault-gold" />
      <span className="px-3 text-xs leading-5">Image unavailable</span>
    </div>
  );
}
