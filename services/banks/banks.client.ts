import type { TBanksApiResponse, TBankItem } from "@/types/banks.types";

export const getBanksClientService = async (): Promise<TBankItem[]> => {
  const response = await fetch("/api/banks", { credentials: "include" });

  if (!response.ok) {
    throw new Error("FAILED_TO_FETCH_BANKS");
  }

  const payload = (await response.json()) as TBanksApiResponse;
  return payload.banks ?? [];
};
