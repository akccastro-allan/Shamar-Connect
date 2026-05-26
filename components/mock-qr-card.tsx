import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const mockQrSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><rect width="240" height="240" fill="white"/><rect x="20" y="20" width="60" height="60" fill="#0f766e"/><rect x="35" y="35" width="30" height="30" fill="white"/><rect x="160" y="20" width="60" height="60" fill="#0f766e"/><rect x="175" y="35" width="30" height="30" fill="white"/><rect x="20" y="160" width="60" height="60" fill="#0f766e"/><rect x="35" y="175" width="30" height="30" fill="white"/><rect x="100" y="100" width="20" height="20" fill="#0f766e"/><rect x="130" y="100" width="20" height="20" fill="#0f766e"/><rect x="100" y="130" width="20" height="20" fill="#0f766e"/><rect x="160" y="130" width="20" height="20" fill="#0f766e"/><rect x="190" y="160" width="20" height="20" fill="#0f766e"/><rect x="130" y="180" width="20" height="20" fill="#0f766e"/><text x="120" y="232" text-anchor="middle" font-family="Arial" font-size="12" fill="#0f172a">ShamarConnect Mock QR</text></svg>`;

export function MockQrCard() {
  const qrCode = "data:image/svg+xml;utf8," + encodeURIComponent(mockQrSvg);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Conexão WhatsApp</CardTitle>
            <CardDescription>Fase 0.1 com QR Code mockado e provider desacoplado.</CardDescription>
          </div>
          <Badge variant="success">Conectado</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="rounded-2xl border bg-white p-3">
          <img src={qrCode} alt="QR Code mockado" width={180} height={180} />
        </div>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Mock conectado para validação interna.</p>
          <p className="text-xs text-muted-foreground">Provider ativo: mock</p>
          <Button variant="outline">Atualizar QR Code</Button>
        </div>
      </CardContent>
    </Card>
  );
}
