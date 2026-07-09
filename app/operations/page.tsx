import { redirect } from "next/navigation";

export const metadata = { title: "Centro de Comando — ShamarConnect" };

export default function OperationsRedirectPage() {
  redirect("/admin/command-center");
}
