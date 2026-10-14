import type { Metadata } from "next";
import { AppHeader } from "@/components/ui/AppHeader";
import RepApp from "@/components/rep/RepApp";

export const metadata: Metadata = { title: "Concierge Rep App" };

export default function Page() {
  return (
    <>
      <AppHeader name="Concierge Rep App" />
      <RepApp />
    </>
  );
}
