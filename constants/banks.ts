/**
 * Danh sách ngân hàng Việt Nam dùng cho combobox/autocomplete (chọn hoặc nhập tên).
 * Format: id (mã ngắn), name (tên đầy đủ hiển thị).
 */
export const VIETNAM_BANKS = [
    { id: "agribank", name: "Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam (Agribank)" },
    { id: "ocb", name: "Ngân hàng Thương mại Cổ phần Phương Đông (OCB)" },
    { id: "bidv", name: "Ngân hàng Đầu tư và Phát triển Việt Nam (BIDV)" },
    { id: "vietinbank", name: "Ngân hàng Công Thương Việt Nam (VietinBank)" },
    { id: "vietcombank", name: "Ngân hàng Ngoại thương Việt Nam (Vietcombank)" },
    { id: "vpbank", name: "Ngân hàng Việt Nam Thịnh Vượng (VPBank)" },
    { id: "mbbank", name: "Ngân hàng Quân đội (MBBank)" },
    { id: "techcombank", name: "Ngân hàng Kỹ Thương Việt Nam (Techcombank)" },
    { id: "shb", name: "Ngân hàng Sài Gòn – Hà Nội (SHB)" },
    { id: "acb", name: "Ngân hàng Á Châu (ACB)" },
    { id: "hdbank", name: "NH TMCP Phát triển TP. Hồ Chí Minh (HDBank)" },
    { id: "sacombank", name: "Ngân hàng Sài Gòn Thương Tín (Sacombank)" },
    { id: "tpbank", name: "Ngân hàng Tiên Phong (TPBank)" },
    { id: "vib", name: "Ngân hàng TMCP Quốc tế Việt Nam (VIB)" },
    { id: "pvcombank", name: "Ngân hàng TMCP Đại Chúng Việt Nam (PVcombank)" },
    { id: "abbank", name: "Ngân hàng An Bình (ABBANK)" },
    { id: "ncb", name: "Ngân hàng Quốc Dân (NCB)" },
    { id: "namabank", name: "Ngân hàng TMCP Nam Á (Nam A Bank)" },
    { id: "vietbank", name: "Ngân hàng Việt Nam Thương Tín (VietBank)" },
    { id: "vietabank", name: "Ngân hàng TMCP Việt Á (Viet A Bank)" },
    { id: "bvbank", name: "Ngân hàng Bản Việt (BVBank)" },
    { id: "kienlongbank", name: "Ngân hàng Kiên Long (Kienlongbank)" },
    { id: "saigonbank", name: "Ngân hàng Sài Gòn Công Thương (Saigonbank)" },
    { id: "pgbank", name: "Ngân hàng Thịnh vượng và Phát triển (PGBank)" },
    { id: "eximbank", name: "Ngân Hàng TMCP Xuất Nhập Khẩu Việt Nam (Eximbank)" },
] as const;

export type TBankItem = (typeof VIETNAM_BANKS)[number];
