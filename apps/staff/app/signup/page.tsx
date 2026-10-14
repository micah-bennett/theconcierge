import { redirect } from "next/navigation";
import { getSessionUserFromCookies } from "@hop/shared/server/auth";
import { APP_ROLE } from "@/lib/app";
import { SignupForm } from "@/components/SignupForm";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  if (await getSessionUserFromCookies(APP_ROLE)) redirect("/");
  return <SignupForm />;
}
