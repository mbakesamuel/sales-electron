import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import { ImageOff } from "lucide-react";
import logoSrc from "../../assets/logo.svg";
import "./ReportHeader.css";

export interface ReportHeaderProps {
  companyName?: string;
  department: string | null;
  serviceName: string | null;
  title: string;
  meta?: ComponentChildren;
}

function ReportLogo({ companyName }: { companyName?: string }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div class="report-header-logo report-header-logo-placeholder" aria-hidden="true">
        <ImageOff size={40} />
      </div>
    );
  }

  return (
    <img
      class="report-header-logo"
      src={logoSrc}
      alt={`${companyName} logo`}
      onError={() => setHasError(true)}
    />
  );
}

export function ReportHeader({
  companyName,
  department,
  serviceName,
  title,
  meta,
}: ReportHeaderProps) {
  return (
    <header class="report-header">
    {/*   <div class="report-header-logo-wrap">
        <ReportLogo companyName={companyName} />
      </div> */}
      {meta ? <div class="report-header-meta">{meta}</div> : null}

      <div class="report-header-company">
        <p class="report-header-company-name">{companyName}</p>
        {department ? <p class="report-header-department">{department}</p> : null}
        {serviceName ? (
          <p class="report-header-commercial-service">{serviceName}</p>
        ) : null}
      </div>

      <h1 class="report-header-title">{title}</h1>
    </header>
  );
}
