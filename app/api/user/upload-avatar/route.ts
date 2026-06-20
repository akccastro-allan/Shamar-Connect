import { NextRequest, NextResponse } from "next/server";
import { getRequiredAppContext, isUnauthorizedError } from "@/lib/auth/app-context";
import { createSupabaseWriteClient } from "@/lib/supabase/server-write";

const BUCKET = "avatars";
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: NextRequest) {
  try {
    const context = await getRequiredAppContext();
    const db = createSupabaseWriteClient();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ ok: false, error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ ok: false, error: "Formato inválido. Use JPG, PNG ou WebP." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_SIZE_BYTES) {
      return NextResponse.json({ ok: false, error: "Arquivo muito grande. Máximo 2 MB." }, { status: 400 });
    }

    // Ensure bucket exists
    const { data: buckets } = await db.storage.listBuckets();
    const bucketExists = (buckets ?? []).some((b) => b.name === BUCKET);
    if (!bucketExists) {
      await db.storage.createBucket(BUCKET, { public: true });
    }

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const filePath = `${context.appUserId}/avatar.${ext}`;

    const { error: uploadError } = await db.storage
      .from(BUCKET)
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: publicData } = db.storage.from(BUCKET).getPublicUrl(filePath);
    // Bust cache with timestamp
    const avatarUrl = `${publicData.publicUrl}?t=${Date.now()}`;

    // Save to app_users
    const { error: updateError } = await db
      .from("app_users")
      .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq("id", context.appUserId);

    if (updateError) throw updateError;

    return NextResponse.json({ ok: true, avatarUrl });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Erro ao fazer upload" }, { status: 500 });
  }
}
