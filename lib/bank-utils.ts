import type { TBankItem } from "@/types/banks.types";

export const formatBankDisplay = (
  bank: Pick<TBankItem, "name" | "code">
): string => `${bank.name} (${bank.code})`;

export const findBankByDisplayValue = (
  value: string,
  banks: TBankItem[]
): TBankItem | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const byFormatted = banks.find((bank) => formatBankDisplay(bank) === trimmed);
  if (byFormatted) return byFormatted;

  return banks.find((bank) => bank.name === trimmed);
};
