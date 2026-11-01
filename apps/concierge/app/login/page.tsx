import { redirect } from "next/navigation";
import { getSessionUserFromCookies } from "@hop/shared/server/auth";
import { LoginScreen } from "@hop/shared/ui/LoginScreen";
import { APP_NAME, APP_ROLE, APP_TAGLINE } from "@/lib/app";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getSessionUserFromCookies(APP_ROLE)) redirect("/");
  return <LoginScreen appName={APP_NAME} tagline={APP_TAGLINE} signupHref="/signup" />;
}
