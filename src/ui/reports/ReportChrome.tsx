import type { ComponentChildren } from "preact";
import { createContext } from "preact";
import { useCallback, useContext, useState } from "preact/hooks";
import { Printer } from "lucide-react";

export type ReportPrintAction = {
  print: () => void;
  busy: boolean;
  canPrint: boolean;
};

const ReportPrintRegisterContext = createContext<
  ((action: ReportPrintAction | null) => void) | null
>(null);
const ReportPrintActionContext = createContext<ReportPrintAction | null>(null);

export function ReportChromeProvider({ children }: { children: ComponentChildren }) {
  const [action, setAction] = useState<ReportPrintAction | null>(null);
  const register = useCallback((next: ReportPrintAction | null) => {
    setAction(next);
  }, []);

  return (
    <ReportPrintRegisterContext.Provider value={register}>
      <ReportPrintActionContext.Provider value={action}>
        {children}
      </ReportPrintActionContext.Provider>
    </ReportPrintRegisterContext.Provider>
  );
}

export function useReportPrintRegister() {
  return useContext(ReportPrintRegisterContext);
}

export function ReportPrintButton() {
  const action = useContext(ReportPrintActionContext);
  return (
    <button
      type="button"
      class="report-inline-print"
      disabled={!action?.canPrint || action.busy}
      onClick={() => action?.print()}
    >
      <Printer size={16} aria-hidden="true" />
      {action?.busy ? "Printing…" : "Print"}
    </button>
  );
}
