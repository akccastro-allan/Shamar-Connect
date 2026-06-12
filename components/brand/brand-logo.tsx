type BrandLogoProps = {
  className?: string;
  variant?: "complete" | "mark";
};

const logos = {
  complete: "https://assets.shamarconnect.com.br/Shamarconect-logo-completa.png",
  mark: "https://assets.shamarconnect.com.br/Shamarconect-logo.png",
};

export function BrandIcon({ className = "h-11 w-11" }: { className?: string }) {
  return <img src={logos.mark} alt="Ícone ShamarConnect" className={className} />;
}

export function BrandLogo({ className = "h-auto w-full max-w-md", variant = "complete" }: BrandLogoProps) {
  return <img src={logos[variant]} alt="Logo ShamarConnect" className={className} />;
}
