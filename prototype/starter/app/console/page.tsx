import type { Metadata } from "next";
import { AppHeader } from "@/components/ui/AppHeader";
import ConsoleApp from "@/components/console/ConsoleApp";

export const metadata: Metadata = { title: "Concierge Console" };

export default function Page() {
  return (
    <>
      <AppHeader name="Concierge Console" />
      <ConsoleApp />
    </>
  );
}
