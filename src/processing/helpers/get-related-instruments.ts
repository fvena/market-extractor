import type { BmeContinuoDetails, EuronextDetails, RelatedInstrument } from "../../types/types";

export function getRelatedInstrumentsBmeContinuo(details: BmeContinuoDetails): RelatedInstrument[] {
  return details.relatedInstruments.map((instrument) => ({
    isin: instrument.isin,
    name: instrument.name,
    ticker: instrument.ticker,
  }));
}

export function getRelatedInstrumentsEuronext(details: EuronextDetails): RelatedInstrument[] {
  return details.relatedInstruments.map((instrument) => ({
    isin: instrument.isin,
    name: instrument.name,
    ticker: instrument.symbol,
  }));
}
