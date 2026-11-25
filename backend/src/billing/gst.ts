import { ApiError } from '../errors';

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export interface GstBreakdown {
  taxablePaise: number;
  gstPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalPaise: number;
  rateBps: number;
  intraState: boolean;
}

/** Prices are GST-inclusive. Intra-state supply splits the 18% tax into CGST and SGST. */
export function splitGst(
  totalPaise: number,
  supplierStateCode: string,
  placeOfSupply: string,
): GstBreakdown {
  if (!Number.isInteger(totalPaise) || totalPaise < 0) {
    throw new ApiError('API-VAL-001', {
      fields: [{ path: 'amount', message: 'Amount is invalid.' }],
    });
  }
  const taxablePaise = Math.round((totalPaise * 100) / 118);
  const gstPaise = totalPaise - taxablePaise;
  const intraState = supplierStateCode === placeOfSupply;
  if (intraState) {
    const cgstPaise = Math.floor(gstPaise / 2);
    return {
      taxablePaise,
      gstPaise,
      cgstPaise,
      sgstPaise: gstPaise - cgstPaise,
      igstPaise: 0,
      totalPaise,
      rateBps: 1800,
      intraState: true,
    };
  }
  return {
    taxablePaise,
    gstPaise,
    cgstPaise: 0,
    sgstPaise: 0,
    igstPaise: gstPaise,
    totalPaise,
    rateBps: 1800,
    intraState: false,
  };
}

export function assertPlaceOfSupply(code: string): string {
  if (!/^[0-9]{2}$/.test(code)) {
    throw new ApiError('API-VAL-001', {
      fields: [{ path: 'placeOfSupply', message: 'Use a 2-digit state code.' }],
    });
  }
  const numeric = Number(code);
  if (numeric < 1 || numeric > 38) {
    throw new ApiError('API-VAL-001', {
      fields: [{ path: 'placeOfSupply', message: 'State code is not valid.' }],
    });
  }
  return code;
}

export function assertGstin(gstin: string, placeOfSupply: string): string {
  const normalized = gstin.normalize('NFKC').trim().toUpperCase();
  if (!GSTIN_RE.test(normalized) || normalized.slice(0, 2) !== placeOfSupply) {
    throw new ApiError('API-BILL-004');
  }
  return normalized;
}
