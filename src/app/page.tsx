"use client";

import { useRouter } from "next/navigation";
import { useToken } from "@/lib/context";
import { LandingPage } from "@/components/landing-page";

export default function Home() {
  const router = useRouter();
  const { user } = useToken();

  return (
    <LandingPage
      onEnterDashboard={() => router.push("/platform")}
      userName={user?.name}
    />
  );
}
