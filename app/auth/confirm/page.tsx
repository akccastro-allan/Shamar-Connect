"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function AuthConfirmInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");

    if (!tokenHash || type !== "recovery") {
      setErrorMsg("Link inválido ou expirado. Solicite uma nova recuperação de senha.");
      setStatus("error");
      return;
    }

    const supabase = createSupabaseBrowserClient();

    supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" }).then(({ error }) => {
      if (error) {
        setErrorMsg("Link inválido ou expirado. Solicite uma nova recuperação de senha.");
        setStatus("error");
        return;
      }

      router.replace("/login/reset-password");
    });
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F6F8FC] px-5 py-10 text-slate-900 md:px-8">
      <section className="w-full max-w-[480px] rounded-[2rem] border border-slate-200 bg-white p-7 text-center shadow-xl shadow-slate-200/50 md:p-8">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-black tracking-tight text-[#132B57]">
            Shamar Connect
          </Link>
        </div>

        {status === "loading" ? (
          <>
            <div className="mx-auto mb-5 h-9 w-9 animate-spin rounded-full border-4 border-[#2ABFAB] border-t-transparent" />
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9952A]">
              Verificação
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[#132B57]">
              Validando seu link
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Aguarde enquanto confirmamos sua solicitação de recuperação de senha.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9952A]">
              Link expirado
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[#132B57]">
              Não foi possível validar
            </h1>
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-semibold leading-6 text-red-700">
              {errorMsg}
            </div>
            <Link
              href="/login"
              className="mt-7 inline-flex w-full justify-center rounded-2xl bg-[#2ABFAB] px-5 py-4 text-sm font-black text-white shadow-lg shadow-[#2ABFAB]/20 transition hover:-translate-y-0.5 hover:bg-[#22A898]"
            >
              Voltar ao login
            </Link>
          </>
        )}
      </section>
    </main>
  );
}

export default function AuthConfirmPage() {
  return (
    <Suspense>
      <AuthConfirmInner />
    </Suspense>
  );
}
