const currencyFormatter = new Intl.NumberFormat("nl-BE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("nl-BE", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatCurrency(value?: number): string {
  if (value === undefined || Number.isNaN(value)) {
    return "n.v.t.";
  }

  return currencyFormatter.format(value);
}

export function formatPercent(value?: number): string {
  if (value === undefined || Number.isNaN(value)) {
    return "n.v.t.";
  }

  return percentFormatter.format(value);
}
