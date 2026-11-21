import { ImageResponse } from "next/og";
import { getServerClient } from "@/lib/supabase/server";

export const runtime = "edge";
export const alt = "투표하자";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await getServerClient();
  const { data: poll } = await supabase
    .from("polls")
    .select("title, description")
    .eq("id", params.id)
    .maybeSingle();

  const title = poll?.title ?? "투표하자";
  const sub = poll?.description ?? "지금 투표하기";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px 80px",
          background: "#fafaf8",
          fontFamily: "sans-serif",
        }}
      >
        {/* 브랜드 */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "#4263eb",
            marginBottom: 32,
            letterSpacing: "-0.02em",
          }}
        >
          투표하자
        </div>

        {/* 투표 제목 */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: "#1a1a18",
            lineHeight: 1.2,
            letterSpacing: "-0.03em",
            maxWidth: 900,
          }}
        >
          {title}
        </div>

        {/* 설명 */}
        {sub && (
          <div
            style={{
              fontSize: 32,
              color: "#787872",
              marginTop: 24,
              maxWidth: 800,
              lineHeight: 1.4,
            }}
          >
            {sub}
          </div>
        )}

        {/* 하단 CTA */}
        <div
          style={{
            position: "absolute",
            bottom: 72,
            right: 80,
            fontSize: 26,
            fontWeight: 700,
            color: "#4263eb",
          }}
        >
          지금 투표하기 →
        </div>
      </div>
    ),
    { ...size },
  );
}
