import Link from "next/link";

export default function NotFound() {
  return (
    <div className="empty">
      <p>투표를 찾을 수 없어요. 삭제되었거나 잘못된 링크예요.</p>
      <Link href="/" className="btn btn-ghost">
        목록으로
      </Link>
    </div>
  );
}
