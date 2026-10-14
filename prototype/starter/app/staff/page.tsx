import type { Metadata } from "next";
import { AppHeader } from "@/components/ui/AppHeader";
import StaffApp from "@/components/staff/StaffApp";

export const metadata: Metadata = { title: "Staff App" };

export default function Page() {
  return (
    <>
      <AppHeader name="Staff App" />
      <StaffApp />
    </>
  );
}
