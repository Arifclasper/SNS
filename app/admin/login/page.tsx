import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { LoginForm } from "@/components/admin/LoginForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await isAuthed()) redirect("/admin");

  return (
    <div className="flex min-h-screen items-center justify-center bg-raised px-5 py-16">
      <LoginForm />
    </div>
  );
}
