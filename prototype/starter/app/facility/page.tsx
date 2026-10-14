import type { Metadata } from "next";
import { AppHeader } from "@/components/ui/AppHeader";
import FacilityApp from "@/components/facility/FacilityApp";

export const metadata: Metadata = { title: "Facility View" };

export default function Page() {
  return (
    <>
      <AppHeader name="Facility View" />
      <FacilityApp />
    </>
  );
}
