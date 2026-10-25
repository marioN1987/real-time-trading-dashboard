const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CHF",
  "AUD",
  "CAD",
  "NZD",
  "SEK",
  "NOK",
  "SGD",
  "HKD",
  "MXN",
  "ZAR",
  "TRY",
];

// Generate 200 instruments.
export const INITIAL_INSTRUMENTS = [
  ...new Set([
    ...CURRENCIES.flatMap((base) =>
      CURRENCIES.filter((quote) => quote !== base).map(
        (quote) => `${base}${quote}`,
      ),
    ),
  ]),
].slice(0, 200);