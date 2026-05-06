"use client";

import Image from "next/image";
import { ImageOff } from "lucide-react";

export function isDisplayableImage(url?: string) {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return !clean.endsWith(".heic") && !clean.endsWith(".heif");
}

export function AssetImage({ src, alt, fill = true, sizes = "100vw", className = "object-cover", priority = false }: { src?: string; alt: string; fill?: boolean; sizes?: string; className?: string; priority?: boolean }) {
  if (!isDisplayableImage(src)) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-vault-black text-center text-vault-muted">
        <ImageOff size={24} className="text-vault-gold" />
        <span className="px-3 text-xs leading-5">HEIC proof stored. Upload JPG, PNG, or WebP for preview.</span>
      </div>
    );
  }

  return <Image src={src as string} alt={alt} fill={fill} priority={priority} sizes={sizes} className={className} unoptimized={src?.includes("supabase.co/storage")} />;
}
