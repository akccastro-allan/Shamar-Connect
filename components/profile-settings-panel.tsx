"use client";

import { FormEvent, useRef, useState } from "react";
import { Upload, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type UserProfile = {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
};

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data?.error || "Erro na operação");
  return data;
}

export function ProfileSettingsPanel({ initialProfile }: { initialProfile: UserProfile }) {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);

  // Name
  const [name, setName] = useState(initialProfile.name);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState("");

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Avatar
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  async function handleSaveName(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setNameSaving(true);
    setNameError("");
    setNameSuccess(false);
    try {
      const data = await apiFetch<{ ok: boolean; user: UserProfile }>("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setProfile(data.user);
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setNameSaving(false);
    }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError("As senhas não coincidem.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }

    setPasswordSaving(true);
    try {
      await apiFetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 4000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Erro ao alterar senha");
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setAvatarError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/user/upload-avatar", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data?.error || "Erro ao enviar foto");
      setProfile((prev) => ({ ...prev, avatar_url: data.avatarUrl }));
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Erro ao enviar foto");
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const initials = (profile.name || profile.email || "?").charAt(0).toUpperCase();

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Upload className="h-4 w-4" />Foto de perfil</CardTitle>
          <CardDescription>JPG, PNG ou WebP · Máximo 2 MB.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.name}
                  className="h-20 w-20 rounded-full object-cover ring-2 ring-[#2ABFAB]/30"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#2ABFAB]/20 text-2xl font-black text-[#2ABFAB]">
                  {initials}
                </div>
              )}
              {avatarUploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-xs text-white">
                  Enviando…
                </div>
              )}
            </div>
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
                disabled={avatarUploading}
              />
              <Button
                type="button"
                variant="outline"
                disabled={avatarUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarUploading ? "Enviando…" : "Trocar foto"}
              </Button>
              {profile.avatar_url && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="block text-xs text-slate-400 hover:text-red-600"
                  disabled={avatarUploading}
                  onClick={async () => {
                    setAvatarError("");
                    try {
                      const data = await apiFetch<{ ok: boolean; user: UserProfile }>("/api/user/profile", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ avatar_url: "" }),
                      });
                      setProfile(data.user);
                    } catch (err) {
                      setAvatarError(err instanceof Error ? err.message : "Erro ao remover foto");
                    }
                  }}
                >
                  Remover foto
                </Button>
              )}
              {avatarError && <p className="text-xs text-red-600">{avatarError}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Name */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserRound className="h-4 w-4" />Dados da conta</CardTitle>
          <CardDescription>Atualize seu nome de exibição.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveName} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">E-mail</span>
              <input
                type="email"
                value={profile.email}
                disabled
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500"
              />
              <p className="mt-1 text-xs text-slate-400">O e-mail não pode ser alterado aqui.</p>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Nome</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#2ABFAB] focus:ring-2 focus:ring-[#2ABFAB]/20"
                placeholder="Seu nome"
              />
            </label>
            {nameError && <p className="text-sm text-red-600">{nameError}</p>}
            {nameSuccess && <p className="text-sm text-emerald-600">Nome atualizado com sucesso.</p>}
            <Button type="submit" disabled={nameSaving || !name.trim() || name === profile.name}>
              {nameSaving ? "Salvando…" : "Salvar nome"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" />Alterar senha</CardTitle>
          <CardDescription>Mínimo de 8 caracteres. Você continuará logado após alterar.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Senha atual</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#2ABFAB] focus:ring-2 focus:ring-[#2ABFAB]/20"
                placeholder="••••••••"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Nova senha</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#2ABFAB] focus:ring-2 focus:ring-[#2ABFAB]/20"
                placeholder="Mínimo 8 caracteres"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Confirmar nova senha</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#2ABFAB] focus:ring-2 focus:ring-[#2ABFAB]/20"
                placeholder="Repita a nova senha"
              />
            </label>
            {passwordError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                Senha alterada com sucesso.
              </div>
            )}
            <Button
              type="submit"
              disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
            >
              {passwordSaving ? "Alterando…" : "Alterar senha"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
