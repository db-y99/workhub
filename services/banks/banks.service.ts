import { VIETQR_CONFIG } from "@/config/vietqr";
import { createError } from "@/lib/errors";
import { err, ok, type Result } from "@/types/result.types";
import type { TBankItem, TVietQrBankRaw, TVietQrBanksResponse } from "@/types/banks.types";

const mapBank = (bank: TVietQrBankRaw): TBankItem => ({
  id: bank.code,
  name: bank.name,
  code: bank.code,
  shortName: bank.shortName,
  logo: bank.logo,
  bin: bank.bin,
});

export const getBanksService = async (): Promise<Result<TBankItem[]>> => {
  const response = await fetch(VIETQR_CONFIG.BANKS_API_URL, {
    next: { revalidate: 86_400 },
  });

  if (!response.ok) {
    return err(createError.database("FETCH_BANKS_FAILED"));
  }

  const payload = (await response.json()) as TVietQrBanksResponse;

  if (payload.code !== "00" || !Array.isArray(payload.data)) {
    return err(createError.database("INVALID_BANKS_RESPONSE"));
  }

  const banks = payload.data
    .filter((bank) => bank.transferSupported === 1)
    .map(mapBank)
    .toSorted((a, b) => a.name.localeCompare(b.name, "vi"));

  return ok(banks);
};
