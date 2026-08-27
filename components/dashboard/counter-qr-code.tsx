"use client";

import { QRCodeSVG } from "qrcode.react";

export function CounterQrCode({ value }: { value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
      <QRCodeSVG value={value} size={280} level="M" />
    </div>
  );
}
