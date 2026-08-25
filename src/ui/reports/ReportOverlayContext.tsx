import { createContext } from "preact";
import { useContext } from "preact/hooks";

export interface ReportOverlayContextValue {
  openReportOverlay: (reportId: string, query?: unknown) => void;
}

export const ReportOverlayContext = createContext<ReportOverlayContextValue>({
  openReportOverlay: () => {},
});

export function useReportOverlay(): ReportOverlayContextValue {
  return useContext(ReportOverlayContext);
}
