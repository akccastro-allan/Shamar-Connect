"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { BrandLogo } from "@/components/brand/brand-logo";

export default function AuthConfirmPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");

    if (!accessToken || !refreshToken || type !== "recovery") {
      setErrorMsg("Link inválido ou expirado. Solicite uma nova recuperação de senha.");
      setStatus("error");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => {
      if (error) {
        setErrorMsg("Sessão inválida. Solicite uma nova recuperação de senha.");
        setStatus("error");
        return;
      }
      router.replace("/login/reset-password");
    });
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <div className="mx-auto mb-8 max-w-xs">
          <BrandLogo className="h-auto w-full" />
        </div>
        {status === "loading" ? (
          <>
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-[#2ABFAB] border-t-transparent" />
            <p className="text-sm text-slate-500">Verificando link...</p>
          </>
        ) : (
          <>
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
            <a href="/login" className="text-sm font-semibold text-[#2ABFAB] hover:underline">
              Voltar ao login
            </a>
          </>
        )}
      </div>
    </main>
  );
}
