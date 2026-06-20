type BrandLogoProps = {
  className?: string;
  variant?: "complete" | "mark";
};

const ASSET_HOST = "https://assets." + "shamarconnect.com.br";

export const SHAMAR_CONNECT_LOGO_PATH = `${ASSET_HOST}/Shamarconect-logo-completa.png`;
export const SHAMAR_CONNECT_ICON_PATH = `${ASSET_HOST}/Shamarconect-logo.png`;

const logos = {
  complete: SHAMAR_CONNECT_LOGO_PATH,
  mark: SHAMAR_CONNECT_ICON_PATH,
};

export function BrandIcon({ className = "h-11 w-11" }: { className?: string }) {
  return <img src="https://assets.shamarconnect.com.br/Escudo%20-%20Shamar-connect%20-%20Fundo%20branco.png" alt="Ícone ShamarConnect" className={className} />;
}

export function BrandLogo({ className = "h-auto w-full max-w-md", variant = "complete" }: BrandLogoProps) {
  return <img src={logos[variant]} alt="Logo ShamarConnect" className={className} />;
}
