import type { MetadataRoute } from "next";

const baseUrl = "https://shamarconnect.com.br";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/planos", "/checkout", "/contato", "/terms", "/privacy", "/cancelamento-e-reembolso"],
        disallow: ["/api/", "/dashboard", "/inbox", "/crm", "/settings", "/login"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
