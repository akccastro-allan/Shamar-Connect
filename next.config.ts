import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Otimizações de build para Vercel
  productionBrowserSourceMaps: false, // Desabilita source maps em produção (~5-8s savings)

  // Experimental features
  experimental: {},
};

export default nextConfig;
