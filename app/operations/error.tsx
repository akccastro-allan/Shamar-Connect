"use client";

import { ErrorState } from "@/components/operations/ui";

export default function OperationsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      message={error.message || "Falha ao carregar dados operacionais."}
      code={error.digest ? "operations_render_error" : "operations_error"}
      onRetry={reset}
    />
  );
}
