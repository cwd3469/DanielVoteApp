"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <button className="btn btn-ghost btn-sm" onClick={logout}>
      로그아웃
    </button>
  );
}
