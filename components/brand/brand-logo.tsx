export const SHAMAR_CONNECT_ICON_PATH = "/brand/shamar-connect-icon.svg";
export const SHAMAR_CONNECT_LOGO_PATH = "/brand/shamar-connect-logo.svg";

export function BrandIcon({ className = "h-11 w-11" }: { className?: string }) {
  return <img src={SHAMAR_CONNECT_ICON_PATH} alt="Ícone ShamarConnect" className={className} />;
}

export function BrandLogo({ className = "h-auto w-full max-w-md" }: { className?: string }) {
  return <img src={SHAMAR_CONNECT_LOGO_PATH} alt="Logo ShamarConnect" className={className} />;
}
