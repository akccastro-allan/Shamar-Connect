import { SHAMAR_CONNECT_ICON_DATA_URI, SHAMAR_CONNECT_LOGO_DATA_URI } from "@/lib/brand/assets";

export function BrandIcon({ className = "h-11 w-11" }: { className?: string }) {
  return <img src={SHAMAR_CONNECT_ICON_DATA_URI} alt="Ícone ShamarConnect" className={className} />;
}

export function BrandLogo({ className = "h-auto w-full max-w-md" }: { className?: string }) {
  return <img src={SHAMAR_CONNECT_LOGO_DATA_URI} alt="Logo ShamarConnect" className={className} />;
}
