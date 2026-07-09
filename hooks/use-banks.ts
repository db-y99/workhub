"use client";

import useSWR from "swr";
import { getBanksClientService } from "@/services/banks/banks.client";
import type { TBankItem } from "@/types/banks.types";

export const useBanks = () =>
  useSWR<TBankItem[]>("banks", getBanksClientService, {
    revalidateOnFocus: false,
    dedupingInterval: 3_600_000,
  });
