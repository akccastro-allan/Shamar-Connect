import { Badge } from "@/components/ui/badge";

export function PageHeader({ title, description, badge }: { title: string; description: string; badge?: string }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {badge ? <Badge variant="secondary">{badge}</Badge> : null}
    </div>
  );
}
