export function printWeeklyPortraitDocument(): void {
  const style = document.createElement("style");
  style.id = "scr-print-weekly-portrait-style";
  style.textContent = `@media print { @page { size: A4 portrait; margin: 6mm 8mm; } }`;
  document.head.appendChild(style);

  document.body.classList.add("scr-print-mode");

  window.addEventListener(
    "afterprint",
    () => {
      document.body.classList.remove("scr-print-mode");
      style.remove();
    },
    { once: true },
  );

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.print();
    });
  });
}
