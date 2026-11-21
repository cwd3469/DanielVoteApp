"use client";

// Design Ref: §2.6 — QR 코드 클라이언트 컴포넌트 (window.location.origin 접근)
import { QRCodeSVG } from "qrcode.react";

interface Props {
  pollId: string;
}

export default function PollQR({ pollId }: Props) {
  const url = `${window.location.origin}/vote/${pollId}`;

  return (
    <div className="poll-qr">
      <p className="poll-qr-label">참여자용 투표 링크 (QR)</p>
      <div className="poll-qr-code">
        <QRCodeSVG value={url} size={180} />
      </div>
      <p className="poll-qr-url">{url}</p>
    </div>
  );
}
