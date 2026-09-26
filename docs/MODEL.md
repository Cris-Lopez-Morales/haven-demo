# Haven model specification

This documents the behavior implemented in `src/finance.ts`. It is a transparent illustrative model, not a lender quote or recommendation to buy a property. Starter records are synthetic, not market research.

## Inputs and units

All currency inputs use dollars. Rent, property insurance, HOA, and mortgage insurance are monthly. Property tax is annual. Interest, vacancy, maintenance, management, capital reserve, closing costs, and down payment are entered as percentages (for example, `6.5` means 6.5%, not 0.065).

The application accepts whole loan terms from 1 to 50 years. Monetary calculator inputs can include cents. Numeric inputs have finite-value and range validation. The core mortgage helper additionally supports fractional-year terms that round to at least one month, but the public scenario schema intentionally permits only whole years.

## Financing

Let price be `V`, down-payment fraction `d`, annual percentage interest input `i`, and loan term `y` years.

```text
down payment = V × d
principal P = V − down payment
monthly interest r = i / 1200
number of payments n = round(y × 12)

monthly principal and interest = P × r / (1 − (1 + r)^−n)
```

For zero interest, payment is `P / n`. For an all-cash purchase, principal and payment are zero.

The implementation uses `-expm1(-n × log1p(r))` for the denominator to improve numerical stability near zero interest and avoid an unnecessarily large positive exponent. Annual amortization simulates monthly interest and principal reduction, caps the final principal payment at the remaining balance, and groups payments by year. Calculations retain floating-point precision internally; displayed currency and rates are rounded.

This is principal and interest only. Tax, property insurance, HOA, reserves and entered mortgage insurance are separate costs; they must not be mistaken for components already inside the mortgage formula. For background on mortgage-payment components, see the [CFPB explanation](https://www.consumerfinance.gov/ask-cfpb/on-a-mortgage-whats-the-difference-between-my-principal-and-interest-payment-and-my-total-monthly-payment-en-1941/).

## Operations and returns

Let `R` be gross scheduled monthly rent. Percentages below are converted to fractions.

```text
vacancy allowance = R × vacancy fraction
effective rent = R − vacancy allowance
monthly tax = annual property tax / 12
maintenance allowance = R × maintenance fraction
management fee = effective rent × management fraction
capital reserve = R × capital-reserve fraction

operating expenses = monthly tax + property insurance + HOA
                   + maintenance allowance + management fee
monthly NOI = effective rent − operating expenses

mortgage insurance = entered monthly amount when principal > 0; otherwise 0
monthly outflow = operating expenses + principal-and-interest payment
                + capital reserve + mortgage insurance
monthly cash flow = effective rent − monthly outflow
annual cash flow = monthly cash flow × 12

cap rate (%) = monthly NOI × 12 / purchase price × 100
initial cash invested = down payment + purchase price × closing-cost fraction
                      + initial repairs
cash-on-cash return (%) = annual cash flow / initial cash invested × 100
```

Cash-on-cash return is undefined (`null`, shown as an em dash) when initial cash is zero; it is not displayed as infinity. Cap rate excludes financing, mortgage insurance, and capital reserves. Closing costs and initial repairs increase initial cash invested, but are not recurring monthly operating costs in this model.

Maintenance and capital reserves are different user-controlled allowances. Enter non-overlapping budgets to avoid counting the same expected work twice. At 100% vacancy, management fees become zero under this model, while the gross-rent-based maintenance and capital reserves remain allocated. This is an explicit modeling choice, not a prediction of actual expenses.

Down payments below 20% with no entered mortgage insurance show a reminder. The app does not calculate premiums, determine loan eligibility, or assert that a specific loan does or does not require mortgage insurance. It also does not automatically remove an entered premium during amortization; the entered monthly figure is used for the modeled cash-flow scenario.

## Reproduce the first sample

The Willow House has fictional price $325,000, gross rent $2,800/month, tax $4,800/year, property insurance $125/month, and no HOA. Use the default financing and operating assumptions.

| Output | Approximate result |
| --- | ---: |
| Down payment | $65,000 |
| Mortgage principal | $260,000 |
| Monthly principal and interest | $1,643.38 |
| Effective monthly rent | $2,660.00 |
| Monthly operating expenses | $877.80 |
| Monthly net operating income | $1,782.20 |
| Monthly capital reserve | $84.00 |
| Monthly cash flow | $54.82 |
| Initial cash invested | $74,750.00 |
| Cap rate | 6.58% |
| Cash-on-cash return | 0.88% |

The interface rounds monthly cash flow to `+$55`. Switching to all cash removes the mortgage payment but increases the initial investment; monthly cash flow becomes $1,698.20. Changing only the interest rate to zero under 20% down produces about $975.98/month of cash flow.

These values are regression examples, not investment targets or assertions about current real-estate conditions.

## Comparisons and sensitivity

Discover and Compare use the same baseline assumptions for every property, with each property's own rent, price, taxes, insurance and HOA. Editing a calculator scenario does not silently redefine the comparison baseline or overwrite the original property record.

Sensitivity evaluates gross rent at −10%, current, and +10%, against interest at −1 percentage point, current, and +1 percentage point. Interest is bounded to 0–30% and rent to the supported input range; boundary cases may therefore repeat values. All-cash sensitivity is unchanged by interest rates.

## Not modeled

Appreciation, future rent growth, time-varying vacancies, tax deductions or income taxes, sale proceeds, transaction-specific closing estimates, adjustable rates, refinance strategies, changing insurance premiums, lender underwriting, financing eligibility, regulatory compliance, and detailed building-condition forecasts are outside this prototype.

The closing-cost percentage is an input, not a quote. See [CFPB background on mortgage costs](https://www.consumerfinance.gov/ask-cfpb/what-costs-come-with-taking-out-a-mortgage-en-153/) for the distinction between loan-related costs and other purchase expenses.
