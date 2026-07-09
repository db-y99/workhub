export type TVietQrBankRaw = {
  id: number;
  name: string;
  code: string;
  bin: string;
  shortName: string;
  logo: string;
  transferSupported: number;
  lookupSupported: number;
};

export type TVietQrBanksResponse = {
  code: string;
  desc: string;
  data: TVietQrBankRaw[];
};

export type TBankItem = {
  id: string;
  name: string;
  code: string;
  shortName: string;
  logo: string;
  bin: string;
};

export type TBanksApiResponse = {
  banks: TBankItem[];
};
