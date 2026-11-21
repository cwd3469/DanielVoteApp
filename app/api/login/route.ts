import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { password } = await request.json();
  const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

  if (!adminPassword || password !== adminPassword) {
    return NextResponse.json(
      { error: "비밀번호가 틀렸습니다" },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("admin_session", adminPassword, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30일
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
