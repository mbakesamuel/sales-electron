import { useEffect, useMemo, useState } from "preact/hooks";
import type { SalesBudgetPhaseResult } from "../../shared/salesBudgetPhase.ts";
import {
  buildSalesBudgetPhase,
  formatPhasedQtyKgDisplay,
  monthName,
  normalizeFiscalMonthPercents,
} from "../../shared/salesBudgetPhase.ts";
import {
  SALES_BUDGET_GROUPS,
  canonicalProductIdForGroup,
  resolveSalesBudgetGroupProductIds,
  type SalesBudgetCategoryRef,
  type SalesBudgetGroupId,
  type SalesBudgetProductRef,
} from "../../shared/salesBudgetGroups.ts";
import { getAuthenticatedDb } from "../auth/db.ts";
import { getElectronApi } from "../auth/client.ts";
import { ReportFooter } from "../reports/ReportFooter.tsx";
import "./SalesBudgetScreen.css";

interface SalesBudgetScreenProps {
  readOnly?: boolean;
}

type FinancialYearPeriodRow = {
  financialYear: number;
  startDate: string;
  endDate: string;
  status: string;
};

type BudgetRow = {
  financialYear: number;
  productId: number;
  annualQtyKg: string;
  budgetUnitPricePerKg: string;
};

type PhaseProfileRow = {
  financialYear: number;
  productId: number;
  pctM01: string;
  pctM02: string;
  pctM03: string;
  pctM04: string;
  pctM05: string;
  pctM06: string;
  pctM07: string;
  pctM08: string;
  pctM09: string;
  pctM10: string;
  pctM11: string;
  pctM12: string;
};

type FiscalMonthLabel = { financialMonth: number; label: string };

type BudgetGroupView = {
  id: SalesBudgetGroupId;
  label: string;
  productIds: number[];
  storageProductId: number | null;
};

function formatPeriodLabel(p: FinancialYearPeriodRow): string {
  const sy = p.startDate?.slice(0, 10) ?? "";
  const ey = p.endDate?.slice(0, 10) ?? "";
  const sY = sy ? sy.slice(0, 4) : String(p.financialYear);
  const eY = ey ? ey.slice(0, 4) : String(p.financialYear);
  return `FY ${p.financialYear} (${sY}–${eY}) · ${p.status}`;
}

function pad12(values: string[]): string[] {
  const next = Array.from({ length: 12 }, (_, i) => values[i] ?? "0");
  return next;
}

function parsePercentNumber(v: string): number {
  const s = String(v ?? "").trim().replace(",", ".");
  if (!s) return 0;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function sumEnteredPercents(values: string[]): number {
  return values.reduce((acc, v) => acc + parsePercentNumber(v), 0);
}

const PCT_SUM_OK_EPS = 0.02;

function fiscalMonthCalendarLabel(
  financialYear: number,
  financialMonth: number,
  fiscalYearStartMonth: number,
): string {
  const zeroBased = financialMonth - 1;
  const startZero = fiscalYearStartMonth - 1;
  const calendarMonth = (startZero + zeroBased) % 12;
  const yearOffset = Math.floor((startZero + zeroBased) / 12);
  const calendarYear = financialYear + yearOffset;
  return `${monthName(calendarMonth + 1)} ${calendarYear}`;
}

function parseQtyKg(value: string): number {
  const s = value.trim().replace(",", ".");
  const n = Number.parseFloat(s);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error("Annual quantity must be a non-negative number.");
  }
  return n;
}

function parsePrice(value: string): number {
  const s = value.trim().replace(",", ".");
  const n = Number.parseFloat(s);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error("Unit price must be a non-negative number.");
  }
  return n;
}

function GroupPhasePctEditor(props: {
  disabled: boolean;
  financialYear: number;
  groupId: SalesBudgetGroupId;
  fiscalMonthLabels: FiscalMonthLabel[];
  initialPcts: string[];
  serverPctKey: string;
  onSave: (pcts: string[]) => Promise<void>;
  onAfterSave: () => void;
  onError: (err: unknown) => void;
}) {
  const {
    disabled,
    financialYear,
    groupId,
    fiscalMonthLabels,
    initialPcts,
    serverPctKey,
    onSave,
    onAfterSave,
    onError,
  } = props;

  const [values, setValues] = useState<string[]>(() => pad12(initialPcts));

  useEffect(() => {
    setValues(pad12(initialPcts));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverPctKey]);

  const total = sumEnteredPercents(values);
  const sumOk = Math.abs(total - 100) <= PCT_SUM_OK_EPS;

  return (
    <form
      class="sbb-phase-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (disabled) return;

        if (!sumOk) {
          onError(new Error(`Percentages must total 100% (currently ${total.toFixed(2)}%).`));
          return;
        }

        try {
          await onSave(values);
          onAfterSave();
        } catch (err) {
          onError(err);
        }
      }}
    >
      <input type="hidden" name="financialYear" value={financialYear} />
      <input type="hidden" name="groupId" value={groupId} />

      <div class="sbb-phase-grid">
        {fiscalMonthLabels.map((row, idx) => {
          const name = `pctM${String(row.financialMonth).padStart(2, "0")}`;
          const fieldId = `pct-${groupId}-${name}`;
          return (
            <div key={row.financialMonth} class="sbb-phase-field">
              <label for={fieldId}>
                FY mo {row.financialMonth} · {row.label}
              </label>
              <div class="sbb-phase-input-wrap">
                <input
                  id={fieldId}
                  name={name}
                  type="text"
                  inputMode="decimal"
                  required
                  value={values[idx] ?? ""}
                  onChange={(ev) => {
                    const target = ev.currentTarget;
                    const next = [...values];
                    next[idx] = target.value;
                    setValues(next);
                  }}
                  class="sbb-input"
                  disabled={disabled}
                />
                <span class="sbb-phase-suffix">%</span>
              </div>
            </div>
          );
        })}
      </div>

      <div
        class={`sbb-pct-total ${sumOk ? "sbb-pct-total-ok" : "sbb-pct-total-warn"}`}
      >
        Total: {total.toFixed(2)}%{" "}
        <span class="sbb-pct-total-note">
          {sumOk ? "(100% — OK to save)" : "(must total 100% to save)"}
        </span>
      </div>

      <button
        type="submit"
        disabled={disabled || !sumOk}
        class="sbb-btn sbb-btn-primary"
      >
        Save phasing
      </button>
    </form>
  );
}

function defaultEqualSplitPercentages(): string[] {
  const v = (100 / 12).toFixed(6);
  return Array.from({ length: 12 }, () => v);
}

function profileRowToPercentStrings(row: PhaseProfileRow): string[] {
  const values = [
    row.pctM01,
    row.pctM02,
    row.pctM03,
    row.pctM04,
    row.pctM05,
    row.pctM06,
    row.pctM07,
    row.pctM08,
    row.pctM09,
    row.pctM10,
    row.pctM11,
    row.pctM12,
  ];

  const asNumbers = values.map((v) => parsePercentNumber(v));
  const sum = asNumbers.reduce((acc, n) => acc + n, 0);
  const asPercents = sum <= 1.5 ? asNumbers.map((n) => n * 100) : asNumbers;

  return asPercents.map((n) => String(n));
}

function aggregateGroupBudget(
  productIds: number[],
  budgetByProductId: Map<number, BudgetRow>,
): { annualQtyKg: string; budgetUnitPricePerKg: string; hasAny: boolean } | null {
  let totalQty = 0;
  let totalValue = 0;
  let hasAny = false;
  let fallbackPrice = "";

  for (const productId of productIds) {
    const row = budgetByProductId.get(productId);
    if (!row) continue;
    hasAny = true;
    const qty = Number.parseFloat(row.annualQtyKg);
    const price = Number.parseFloat(row.budgetUnitPricePerKg);
    const qtyN = Number.isFinite(qty) ? qty : 0;
    const priceN = Number.isFinite(price) ? price : 0;
    totalQty += qtyN;
    totalValue += qtyN * priceN;
    if (!fallbackPrice && row.budgetUnitPricePerKg) {
      fallbackPrice = row.budgetUnitPricePerKg;
    }
  }

  if (!hasAny) return null;

  const unitPrice =
    totalQty > 0
      ? String(totalValue / totalQty)
      : fallbackPrice;

  return {
    annualQtyKg: String(totalQty),
    budgetUnitPricePerKg: unitPrice,
    hasAny: true,
  };
}

function firstGroupProfile(
  productIds: number[],
  pctsByProductId: Map<number, string[]>,
): string[] | null {
  for (const productId of productIds) {
    const pcts = pctsByProductId.get(productId);
    if (pcts) return pcts;
  }
  return null;
}

function groupHasAnyBudget(
  productIds: number[],
  budgetByProductId: Map<number, BudgetRow>,
): boolean {
  return productIds.some((id) => budgetByProductId.has(id));
}

export function SalesBudgetScreen({ readOnly = false }: SalesBudgetScreenProps) {
  const [periods, setPeriods] = useState<FinancialYearPeriodRow[]>([]);
  const [fiscalYearStartMonth, setFiscalYearStartMonth] = useState<number>(1);
  const [categories, setCategories] = useState<SalesBudgetCategoryRef[]>([]);
  const [products, setProducts] = useState<SalesBudgetProductRef[]>([]);
  const [selectedFinancialYear, setSelectedFinancialYear] = useState<number | null>(null);
  const [budgetByProductId, setBudgetByProductId] = useState<
    Map<number, BudgetRow>
  >(new Map());
  const [pctsByProductId, setPctsByProductId] = useState<
    Map<number, string[]>
  >(new Map());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [previewGroupId, setPreviewGroupId] = useState<SalesBudgetGroupId | "">("");
  const [previewQtyKg, setPreviewQtyKg] = useState<string>("");
  const [previewPricePerKg, setPreviewPricePerKg] = useState<string>("");
  const [previewBusy, setPreviewBusy] = useState(false);
  const [preview, setPreview] = useState<SalesBudgetPhaseResult | null>(null);

  const api = useMemo(() => getElectronApi(), []);
  const db = useMemo(() => getAuthenticatedDb(), []);

  const budgetGroups: BudgetGroupView[] = useMemo(() => {
    return SALES_BUDGET_GROUPS.map((group) => {
      const productIds = resolveSalesBudgetGroupProductIds(
        group.id,
        categories,
        products,
      );
      return {
        id: group.id,
        label: group.label,
        productIds,
        storageProductId: canonicalProductIdForGroup(productIds),
      };
    });
  }, [categories, products]);

  async function refreshForFinancialYear(fy: number): Promise<void> {
    const [budgetRows, profileRows] = await Promise.all([
      api.db.queryTable({ table: "ProductSalesBudget", limit: 5000 }),
      api.db.queryTable({
        table: "ProductSalesBudgetMonthPhaseProfile",
        limit: 5000,
      }),
    ]);

    const budgetsForFy = (budgetRows.rows as Array<Record<string, unknown>>).filter(
      (r) => Number(r.financialYear) === fy,
    ) as Array<Record<string, unknown>>;

    const profilesForFy = (profileRows.rows as Array<Record<string, unknown>>).filter(
      (r) => Number(r.financialYear) === fy,
    ) as Array<Record<string, unknown>>;

    const nextBudgetMap = new Map<number, BudgetRow>();
    for (const r of budgetsForFy) {
      const productId = Number(r.productId);
      nextBudgetMap.set(productId, {
        financialYear: fy,
        productId,
        annualQtyKg: String(r.annualQtyKg ?? ""),
        budgetUnitPricePerKg: String(r.budgetUnitPricePerKg ?? ""),
      });
    }

    const nextPctsMap = new Map<number, string[]>();
    for (const r of profilesForFy) {
      const productId = Number(r.productId);
      nextPctsMap.set(
        productId,
        profileRowToPercentStrings(r as unknown as PhaseProfileRow),
      );
    }

    setBudgetByProductId(nextBudgetMap);
    setPctsByProductId(nextPctsMap);
  }

  async function clearOtherGroupProductRows(
    fy: number,
    productIds: number[],
    storageProductId: number,
    table: "ProductSalesBudget" | "ProductSalesBudgetMonthPhaseProfile",
  ): Promise<void> {
    for (const productId of productIds) {
      if (productId === storageProductId) continue;
      const hasRow =
        table === "ProductSalesBudget"
          ? budgetByProductId.has(productId)
          : pctsByProductId.has(productId);
      if (!hasRow) continue;
      await db.deleteRow({
        table,
        primaryKey: { financialYear: fy, productId },
      });
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadAll(): Promise<void> {
      setLoading(true);
      setError(null);
      setMessage(null);
      try {
        const [
          fyRows,
          companySettingsRows,
          categoryRows,
          productRows,
          budgetRows,
          profileRows,
        ] = await Promise.all([
          db.queryTable({ table: "FinancialYearPeriod", limit: 500 }),
          db.queryTable({ table: "CompanySettings", limit: 20 }),
          db.queryTable({ table: "ProductCat", limit: 500 }),
          db.queryTable({ table: "Product", limit: 1000 }),
          db.queryTable({ table: "ProductSalesBudget", limit: 5000 }),
          db.queryTable({
            table: "ProductSalesBudgetMonthPhaseProfile",
            limit: 5000,
          }),
        ]);

        if (cancelled) return;

        const fyList = (fyRows.rows as Array<Record<string, unknown>>).map(
          (r) => ({
            financialYear: Number(r.financialYear),
            startDate: String(r.startDate ?? ""),
            endDate: String(r.endDate ?? ""),
            status: String(r.status ?? ""),
          }),
        );

        fyList.sort((a, b) => b.financialYear - a.financialYear);

        const settingsDefault =
          (companySettingsRows.rows as Array<Record<string, unknown>>).find(
            (r) => String(r.id ?? "") === "default",
          ) ?? (companySettingsRows.rows[0] as Record<string, unknown> | undefined);

        const fiscalStart =
          Number(settingsDefault?.fiscalYearStartMonth ?? 1) || 1;

        const categoryList: SalesBudgetCategoryRef[] = (
          categoryRows.rows as Array<Record<string, unknown>>
        ).map((r) => ({
          productCatId: Number(r.productCatId),
          productCat: String(r.productCat ?? ""),
          isMain: Number(r.isMain ?? 0) ? 1 : 0,
          isBottled: Number(r.isBottled ?? 0) ? 1 : 0,
        }));

        const categoryById = new Map(
          categoryList.map((c) => [c.productCatId, c] as const),
        );

        const productList: SalesBudgetProductRef[] = (
          productRows.rows as Array<Record<string, unknown>>
        )
          .map((r) => {
            const productCatId = Number(r.productCatId);
            const cat = categoryById.get(productCatId);
            return {
              productId: Number(r.productId),
              productName: String(r.productName ?? ""),
              productCode:
                r.productCode == null ? null : String(r.productCode),
              productCatId,
              isBottled: cat?.isBottled ?? 0,
            };
          })
          .sort((a, b) => a.productName.localeCompare(b.productName));

        setPeriods(fyList);
        setFiscalYearStartMonth(fiscalStart);
        setCategories(categoryList);
        setProducts(productList);

        const defaultFy = fyList[0]?.financialYear ?? null;
        setSelectedFinancialYear(defaultFy);

        if (defaultFy != null) {
          const budgetsForFy = (budgetRows.rows as Array<Record<string, unknown>>).filter(
            (r) => Number(r.financialYear) === defaultFy,
          );
          const profilesForFy = (profileRows.rows as Array<Record<string, unknown>>).filter(
            (r) => Number(r.financialYear) === defaultFy,
          );

          const nextBudgetMap = new Map<number, BudgetRow>();
          for (const r of budgetsForFy) {
            const productId = Number(r.productId);
            nextBudgetMap.set(productId, {
              financialYear: defaultFy,
              productId,
              annualQtyKg: String(r.annualQtyKg ?? ""),
              budgetUnitPricePerKg: String(r.budgetUnitPricePerKg ?? ""),
            });
          }
          const nextPctsMap = new Map<number, string[]>();
          for (const r of profilesForFy) {
            const productId = Number(r.productId);
            nextPctsMap.set(
              productId,
              profileRowToPercentStrings(r as unknown as PhaseProfileRow),
            );
          }
          setBudgetByProductId(nextBudgetMap);
          setPctsByProductId(nextPctsMap);

          const firstGroup = SALES_BUDGET_GROUPS[0];
          if (firstGroup) {
            setPreviewGroupId(firstGroup.id);
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadAll();

    return () => {
      cancelled = true;
    };
  }, [api, db]);

  useEffect(() => {
    if (!selectedFinancialYear) return;
    if (!previewGroupId) return;

    const group = budgetGroups.find((g) => g.id === previewGroupId);
    if (!group) return;

    const aggregated = aggregateGroupBudget(group.productIds, budgetByProductId);
    if (aggregated) {
      setPreviewQtyKg(aggregated.annualQtyKg);
      setPreviewPricePerKg(aggregated.budgetUnitPricePerKg);
    } else {
      setPreviewQtyKg("");
      setPreviewPricePerKg("");
    }
  }, [budgetByProductId, budgetGroups, previewGroupId, selectedFinancialYear]);

  const fiscalMonthLabels: FiscalMonthLabel[] = useMemo(() => {
    const fy = selectedFinancialYear ?? 0;
    return Array.from({ length: 12 }, (_, i) => {
      const fm = i + 1;
      return {
        financialMonth: fm,
        label: fiscalMonthCalendarLabel(
          fy,
          fm,
          fiscalYearStartMonth,
        ),
      };
    });
  }, [fiscalYearStartMonth, selectedFinancialYear]);

  if (loading) {
    return (
      <div class="sbb-page">
        <p class="sbb-empty">Loading sales budget…</p>
      </div>
    );
  }

  if (!periods.length) {
    return (
      <div class="sbb-page">
        <p class="sbb-empty">
          No financial years exist yet. Add one under Financial years before entering
          budgets.
        </p>
        <ReportFooter />
      </div>
    );
  }

  if (error && products.length === 0 && budgetByProductId.size === 0) {
    return (
      <div class="sbb-page">
        <div class="sbb-alert sbb-alert-error">{error}</div>
        <ReportFooter />
      </div>
    );
  }

  const fy = selectedFinancialYear;
  const fyPeriod = fy == null ? null : periods.find((p) => p.financialYear === fy) ?? null;

  return (
    <div class="sbb-page">
      <header class="sbb-header">
        <h1 class="sbb-title">Sales budget phasing</h1>
        <p class="sbb-lead">
          Set annual quantity (kg) and unit price per kg for each product category.
          Each group has its own monthly phasing percentages for the financial year; quantities
          are phased into fiscal months, then spread across ISO weeks.
        </p>
        {readOnly ? <span class="sbb-readonly-badge">Read only</span> : null}
      </header>

      {message ? <div class="sbb-alert sbb-alert-success">{message}</div> : null}
      {error ? <div class="sbb-alert sbb-alert-error">{error}</div> : null}

      {fyPeriod ? (
        <div class="sbb-toolbar">
          <div class="sbb-field">
            <label class="sbb-label" for="fySelect">
              Financial year
            </label>
            <select
              id="fySelect"
              class="sbb-select"
              value={fy ?? undefined}
              onChange={async (e) => {
                const v = Number.parseInt(e.currentTarget.value, 10);
                if (!Number.isFinite(v)) return;
                setMessage(null);
                setError(null);
                setPreview(null);
                setSelectedFinancialYear(v);
                await refreshForFinancialYear(v);
                setPreviewGroupId((cur) =>
                  cur ? cur : (SALES_BUDGET_GROUPS[0]?.id ?? ""),
                );
              }}
              disabled={readOnly}
            >
              {periods.map((p) => (
                <option key={p.financialYear} value={p.financialYear}>
                  {formatPeriodLabel(p)}
                </option>
              ))}
            </select>
          </div>
          <div class="sbb-toolbar-meta">
            Fiscal start: <strong>{monthName(fiscalYearStartMonth)}</strong>
          </div>
        </div>
      ) : null}

      {fy != null && products.length === 0 ? (
        <p class="sbb-empty">No products in the catalog. Add products before entering budgets.</p>
      ) : null}

      {fy != null && products.length > 0 ? (
        <section class="sbb-card">
          <h2 class="sbb-section-title">Annual budgets by delivery group</h2>
          <p class="sbb-section-hint">
            Enter annual quantity and unit price for FY {fy}, using the same groups as the
            monthly delivery reports (Jan–Jun / Jul–Dec). Expand monthly phasing to set
            fiscal-month percentages (must total 100%).
          </p>
          <div class="sbb-table-wrap">
            <table class="sbb-table">
              <thead>
                <tr>
                  <th>Budget group</th>
                  <th>Annual qty (kg) · unit price (XAF/kg)</th>
                  <th>Monthly phasing ({fy})</th>
                </tr>
              </thead>
              <tbody>
                {budgetGroups.map((group) => {
                  const aggregated = aggregateGroupBudget(
                    group.productIds,
                    budgetByProductId,
                  );
                  const rowPcts =
                    firstGroupProfile(group.productIds, pctsByProductId) ??
                    defaultEqualSplitPercentages();
                  const annRev =
                    aggregated
                      ? (
                          Number.parseFloat(aggregated.annualQtyKg) *
                          Number.parseFloat(aggregated.budgetUnitPricePerKg)
                        ).toFixed(2)
                      : null;
                  const serverPctKey = `${group.id}|${rowPcts.join("|")}`;
                  const canEdit = group.storageProductId != null && !readOnly;
                  return (
                    <tr key={group.id}>
                      <td>
                        <div class="sbb-product-name">{group.label}</div>
                        {group.productIds.length === 0 ? (
                          <div class="sbb-group-hint">No matching products in catalog</div>
                        ) : null}
                      </td>
                      <td>
                        <div class="sbb-budget-cell">
                        <form
                          class="sbb-budget-form"
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (readOnly) return;
                            if (group.storageProductId == null) {
                              setError(
                                `No catalog products match “${group.label}”. Add matching products first.`,
                              );
                              return;
                            }
                            setError(null);
                            setMessage(null);
                            const form = e.currentTarget as HTMLFormElement;
                            const fd = new FormData(form);
                            const annualQtyKgRaw = String(fd.get("annualQtyKg") ?? "").trim();
                            const budgetUnitPricePerKgRaw = String(
                              fd.get("budgetUnitPricePerKg") ?? "",
                            ).trim();
                            const annualQtyKg = parseQtyKg(annualQtyKgRaw);
                            const budgetUnitPricePerKg = parsePrice(budgetUnitPricePerKgRaw);
                            const storageProductId = group.storageProductId;

                            try {
                              await clearOtherGroupProductRows(
                                fy!,
                                group.productIds,
                                storageProductId,
                                "ProductSalesBudget",
                              );

                              if (budgetByProductId.has(storageProductId)) {
                                await db.updateRow({
                                  table: "ProductSalesBudget",
                                  primaryKey: {
                                    financialYear: fy!,
                                    productId: storageProductId,
                                  },
                                  values: {
                                    annualQtyKg: annualQtyKg.toString(),
                                    budgetUnitPricePerKg: budgetUnitPricePerKg.toString(),
                                  },
                                });
                              } else {
                                await db.insertRow({
                                  table: "ProductSalesBudget",
                                  values: {
                                    financialYear: fy!,
                                    productId: storageProductId,
                                    annualQtyKg: annualQtyKg.toString(),
                                    budgetUnitPricePerKg: budgetUnitPricePerKg.toString(),
                                  },
                                });
                              }
                              await refreshForFinancialYear(fy!);
                              setMessage(`Budget saved for ${group.label}.`);
                            } catch (err) {
                              setError(err instanceof Error ? err.message : String(err));
                            }
                          }}
                        >
                          <input
                            name="annualQtyKg"
                            type="text"
                            inputMode="decimal"
                            required
                            defaultValue={aggregated?.annualQtyKg ?? ""}
                            placeholder="Qty kg"
                            aria-label={`Annual qty kg for ${group.label}`}
                            class="sbb-input"
                            disabled={!canEdit}
                            key={`qty-${group.id}-${aggregated?.annualQtyKg ?? ""}`}
                          />
                          <input
                            name="budgetUnitPricePerKg"
                            type="text"
                            inputMode="decimal"
                            required
                            defaultValue={aggregated?.budgetUnitPricePerKg ?? ""}
                            placeholder="XAF/kg"
                            aria-label={`Budget unit price for ${group.label}`}
                            class="sbb-input"
                            disabled={!canEdit}
                            key={`price-${group.id}-${aggregated?.budgetUnitPricePerKg ?? ""}`}
                          />
                          <span class="sbb-derived">
                            {aggregated ? (
                              <>
                                → <strong>{annRev}</strong> XAF
                              </>
                            ) : (
                              "—"
                            )}
                          </span>
                          <button
                            type="submit"
                            disabled={!canEdit}
                            class="sbb-btn sbb-btn-primary"
                          >
                            Save
                          </button>
                        </form>
                        {groupHasAnyBudget(group.productIds, budgetByProductId) ? (
                          <button
                            type="button"
                            class="sbb-btn sbb-btn-ghost"
                            disabled={readOnly || group.storageProductId == null}
                            onClick={async () => {
                              if (readOnly) return;
                              const confirmed = window.confirm(
                                `Clear budget for “${group.label}”? This cannot be undone.`,
                              );
                              if (!confirmed) return;
                              setError(null);
                              setMessage(null);
                              try {
                                for (const productId of group.productIds) {
                                  if (!budgetByProductId.has(productId)) continue;
                                  await db.deleteRow({
                                    table: "ProductSalesBudget",
                                    primaryKey: {
                                      financialYear: fy!,
                                      productId,
                                    },
                                  });
                                }
                                await refreshForFinancialYear(fy!);
                                setMessage(`Cleared budget for ${group.label}.`);
                              } catch (err) {
                                setError(err instanceof Error ? err.message : String(err));
                              }
                            }}
                          >
                            Clear budget
                          </button>
                        ) : null}
                        </div>
                      </td>
                      <td>
                        <details class="sbb-details">
                          <summary aria-label={`Edit phase profile for ${group.label}`}>
                            FY months 1–12 (%)
                          </summary>
                          <div class="sbb-details-body">
                            <p class="sbb-details-hint">
                              Twelve percentages must sum to 100%. Weights drive fiscal-month
                              phasing for this group in {fy}.
                            </p>
                            <GroupPhasePctEditor
                              disabled={!canEdit}
                              financialYear={fy!}
                              groupId={group.id}
                              fiscalMonthLabels={fiscalMonthLabels}
                              serverPctKey={serverPctKey}
                              initialPcts={rowPcts}
                              onSave={async (nextPcts) => {
                                if (readOnly) return;
                                if (group.storageProductId == null) {
                                  throw new Error(
                                    `No catalog products match “${group.label}”.`,
                                  );
                                }
                                const total = sumEnteredPercents(nextPcts);
                                if (Math.abs(total - 100) > PCT_SUM_OK_EPS) {
                                  throw new Error(
                                    `Percentages must total 100% (currently ${total.toFixed(2)}%).`,
                                  );
                                }

                                const storageProductId = group.storageProductId;
                                await clearOtherGroupProductRows(
                                  fy!,
                                  group.productIds,
                                  storageProductId,
                                  "ProductSalesBudgetMonthPhaseProfile",
                                );

                                const hasExisting = pctsByProductId.has(storageProductId);
                                const valuesToSave: Record<string, string | number> = {
                                  financialYear: fy!,
                                  productId: storageProductId,
                                };

                                for (let i = 0; i < 12; i += 1) {
                                  const key = `pctM${String(i + 1).padStart(2, "0")}`;
                                  valuesToSave[key] = nextPcts[i] ?? "0";
                                }

                                if (hasExisting) {
                                  const updateValues = {
                                    ...valuesToSave,
                                  } as Record<string, unknown>;
                                  delete updateValues.financialYear;
                                  delete updateValues.productId;
                                  await db.updateRow({
                                    table: "ProductSalesBudgetMonthPhaseProfile",
                                    primaryKey: {
                                      financialYear: fy!,
                                      productId: storageProductId,
                                    },
                                    values: updateValues as Record<string, unknown>,
                                  });
                                } else {
                                  await db.insertRow({
                                    table: "ProductSalesBudgetMonthPhaseProfile",
                                    values: valuesToSave as Record<string, unknown>,
                                  });
                                }
                                await refreshForFinancialYear(fy!);
                              }}
                              onAfterSave={() => {
                                setMessage(`Phasing saved for ${group.label} (${fy}).`);
                              }}
                              onError={(err) => {
                                setError(err instanceof Error ? err.message : String(err));
                              }}
                            />
                          </div>
                        </details>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {fyPeriod && products.length > 0 ? (
        <section class="sbb-card">
          <h2 class="sbb-section-title">Phasing preview</h2>
          <p class="sbb-section-hint">
            Uses the saved monthly profile for the selected budget group. Preview does not
            save budget rows.
          </p>
          <div class="sbb-preview-form">
            <div class="sbb-field">
              <label class="sbb-label" for="previewGroup">
                Budget group
              </label>
              <select
                id="previewGroup"
                class="sbb-select"
                value={previewGroupId}
                onChange={(e) =>
                  setPreviewGroupId(e.currentTarget.value as SalesBudgetGroupId)
                }
                disabled={readOnly}
              >
                {budgetGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
            <div class="sbb-field">
              <label class="sbb-label" for="previewQty">
                Annual qty (kg)
              </label>
              <input
                id="previewQty"
                type="text"
                inputMode="decimal"
                value={previewQtyKg}
                onChange={(e) => setPreviewQtyKg(e.currentTarget.value)}
                class="sbb-input"
                disabled={readOnly}
              />
            </div>
            <div class="sbb-field">
              <label class="sbb-label" for="previewPrice">
                Unit price (XAF/kg)
              </label>
              <input
                id="previewPrice"
                type="text"
                inputMode="decimal"
                value={previewPricePerKg}
                onChange={(e) => setPreviewPricePerKg(e.currentTarget.value)}
                class="sbb-input"
                disabled={readOnly}
              />
            </div>
            <button
              type="button"
              disabled={previewBusy || readOnly || !previewGroupId}
              class="sbb-btn sbb-btn-primary"
              onClick={async () => {
                if (!fyPeriod) return;
                if (!previewGroupId) return;
                const group = budgetGroups.find((g) => g.id === previewGroupId);
                if (!group) return;
                setPreviewBusy(true);
                setPreview(null);
                setError(null);
                setMessage(null);
                try {
                  const annualQtyKg = previewQtyKg ? parseQtyKg(previewQtyKg) : 0;
                  const price = previewPricePerKg ? parsePrice(previewPricePerKg) : 0;
                  const pcts =
                    firstGroupProfile(group.productIds, pctsByProductId) ??
                    defaultEqualSplitPercentages();
                  const fiscalMonthPercents = normalizeFiscalMonthPercents(
                    pcts.map((v) => parsePercentNumber(v)),
                  ).map((f) => f * 100);

                  const result = buildSalesBudgetPhase({
                    financialYear: fyPeriod.financialYear,
                    fiscalYearStartMonth,
                    fyStartIso: fyPeriod.startDate.slice(0, 10),
                    fyEndIso: fyPeriod.endDate.slice(0, 10),
                    annualQtyKg,
                    budgetUnitPricePerKg: price,
                    fiscalMonthPercents,
                  });
                  setPreview(result);
                } catch (err) {
                  setError(err instanceof Error ? err.message : String(err));
                } finally {
                  setPreviewBusy(false);
                }
              }}
            >
              {previewBusy ? "Running…" : "Run preview"}
            </button>
          </div>

          {preview ? (
            <div class="sbb-preview-list">
              {preview.months.map((m) => {
                const monthTotal = m.weeks.reduce((acc, w) => acc + w.qtyKg, 0);
                return (
                  <details
                    key={`${m.calendarYear}-${m.calendarMonth}`}
                    class="sbb-details sbb-preview-month"
                  >
                    <summary>
                      {m.calendarYear}-{String(m.calendarMonth).padStart(2, "0")} ·{" "}
                      {formatPhasedQtyKgDisplay(monthTotal)} kg
                    </summary>
                    <div class="sbb-details-body">
                      <ul class="sbb-week-list">
                        {m.weeks.map((w) => (
                          <li key={w.label}>
                            {w.label}: {formatPhasedQtyKgDisplay(w.qtyKg)} kg
                          </li>
                        ))}
                      </ul>
                    </div>
                  </details>
                );
              })}
            </div>
          ) : null}
        </section>
      ) : null}

      <ReportFooter />
    </div>
  );
}
