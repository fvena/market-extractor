import type { BmeCorporateActions } from "../../types/bme.types";

export function getCorporateActionsForCompany(
  isin: string,
  issuer: string,
  corporateActions: BmeCorporateActions,
): BmeCorporateActions {
  // Filter actions by issuer in all corporate actions types
  const filteredActions = {
    capitalIncreases: corporateActions.capitalIncreases.filter(
      (action) => action.issuer === issuer,
    ),
    consolidations: corporateActions.consolidations.filter(
      (action) => action.isin === isin || action.issuer === issuer,
    ),
    delistings: corporateActions.delistings.filter(
      (action) => action.isin === isin || action.issuer === issuer,
    ),
    dividends: corporateActions.dividends.filter(
      (action) => action.isin === isin || action.issuer === issuer,
    ),
    listings: corporateActions.listings.filter(
      (action) => action.isin === isin || action.issuer === issuer,
    ),
    specialPayments: corporateActions.specialPayments.filter((action) => action.issuer === issuer),
    splits: corporateActions.splits.filter((action) => action.issuer === issuer),
  };

  return filteredActions;
}
