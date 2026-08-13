import { useEffect, useState } from "preact/hooks";
import { toDataURL } from "qrcode";
import "./QrCode.css";

export interface QrCodeProps {
  value: string;
  size?: number;
  alt?: string;
}

export function QrCode({
  value,
  size = 96,
  alt = "QR code",
}: QrCodeProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void toDataURL(value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: "M",
    })
      .then((dataUrl) => {
        if (!cancelled) {
          setSrc(dataUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSrc(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!src) {
    return (
      <div
        class="qr-code qr-code-placeholder"
        style={{ width: `${size}px`, height: `${size}px` }}
        aria-hidden="true"
      />
    );
  }

  return (
    <img
      class="qr-code"
      src={src}
      width={size}
      height={size}
      style={{ width: `${size}px`, height: `${size}px` }}
      alt={alt}
    />
  );
}
