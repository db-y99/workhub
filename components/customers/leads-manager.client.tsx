"use client";

import { useState, useTransition, useCallback, useEffect, useMemo, useRef } from "react";
import { useDebounceValue } from "usehooks-ts";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Popover, PopoverTrigger, PopoverContent } from "@heroui/popover";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Textarea } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Tooltip } from "@heroui/tooltip";
import { Pagination } from "@heroui/pagination";
import { Skeleton } from "@heroui/skeleton";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  TrendingUp,
  Clock,
  Phone,
  Calendar,
  MapPin,
  RefreshCw,
  X,
  Eye,
  Filter,
  ChevronDown,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import {
  createCustomerLead,
  updateCustomerLead,
  deleteCustomerLead,
  getCustomerLeads,
  getCustomerLeadsStats,
  type CustomerLeadInput,
  type CustomerLeadsStats,
} from "@/lib/actions/customer-leads";
import { getCSProfiles } from "@/lib/actions/profiles";
import { getProfileById } from "@/lib/db/profiles.client";
import { createClient } from "@/lib/supabase/client";


// ─── Client-side functions ───────────────────────────────────────────────────

async function getCurrentUserClient() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Lead = CustomerLeadInput & { id: string; created_at: string };

type CSProfile = {
  id: string;
  full_name: string;
  email: string;
};

type Branch = {
  id: string;
  name: string;
  code: string;
};

type FilterState = {
  dateFrom: string;
  dateTo: string;
  branch: string;
  leadStatus: string;
  source: string;
  fromAds: string;
  engagementStatus: string;
  caseStatus: string;
  finalOutcome: string;
  collateralType: string;
  personInCharge: string;
};

type ImportPreviewData = {
  total: number;
  sheet: string;
  customers: CustomerLeadInput[];
  skipped?: number;
  message?: string;
};

type ImportResult = {
  success: number;
  failed: number;
  errors: string[];
};

const LEAD_STATUS_OPTIONS = [
  "Enquiry",
  "MQL",
  "SQL",
  "Application",
  "Approved",
  "Rejected",
  "Disbursed",
];

const SOURCE_OPTIONS = [
  "Facebook",
  "Zalo",
  "Tiktok",
  "@bitienthighey99",
  "Y99 - luôn sẵn sàng",
  "Y99- Trendy",
  "Walk-in",
  "Referrals",
  "Khách hàng cũ",
  "Whatsapp",
  "Line",
  "Hotline 1900",
  "Hotline 0788",
  "Tài Chính Y99",
  "Tài Chính Y99 - BN",
  "Fanpage Về Tình"
];

const FROM_ADS_OPTIONS = [
  "Natural",
  "FB Ads",
  "Tiktok Ads",
  "Google Ads",
  "Zalo Ads",
  "Reference Bonus",
];

const ENGAGEMENT_STATUS_OPTIONS = [
  "Phản hồi",
  "Im lặng",
  "Đã gọi",
];

const COLLATERAL_OPTIONS = ["Cavet xe máy", "Cavet oto", "iPhone", "Laptop", "Khác"];

const CASE_STATUS_OPTIONS = [
  "Đang xử lý",
  "Đã chuyển cho CS",
  "Đã Chuyển cho CA",
  "Follow up",
  "Xong",
];

const FINAL_OUTCOME_OPTIONS = [
  "Đang tư vấn",
  "Đã tư vấn xong",
  "Đã giải ngân",
  "Từ chối",
  "Im lặng hoặc từ chối sau tin nhắn đầu tiên",
  "Im lặng hoặc từ chối sau khi gửi bảng phỏng",
  "Im lặng hoặc từ chối khi báo hạn mức",
];

const EMPTY_FORM: CustomerLeadInput = {
  date: new Date().toISOString().split('T')[0], // Ngày hôm nay yyyy-mm-dd
  time_slot: new Date().toTimeString().slice(0, 5), // Giờ phút hiện tại HH:MM
  person_in_charge: "",
  facebook_name: "",
  customer_name: "",
  customer_link: "",
  phone_number: "",
  branch: "",
  loan_amount: null,
  collateral_type: "",
  source: "",
  from_ads: "",
  engagement_status: "",
  case_status: "",
  final_outcome: "",
  lead_status: "",
  disbursed_amount: null,
  remarks: "",
  contact_l2: "",
  contact_l3: "",
  referrer_name: "",
  referrer_phone: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtNum(v: number | null | undefined) {
  if (v == null) return "";
  return v.toLocaleString("vi-VN");
}

// Format số tiền dạng 1.000.000 cho input display
function formatCurrency(v: number | null | undefined): string {
  if (v == null) return "";
  return v.toLocaleString("vi-VN");
}

// Convert date from yyyy-mm-dd to dd/mm/yyyy for display only
function formatDateDisplay(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  // If it's in yyyy-mm-dd format, convert to dd/mm/yyyy
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  }
  // Otherwise return as-is
  return dateStr;
}

// Map branch names from import data to actual branch names
function mapBranchName(importBranch: string | undefined, availableBranches: Branch[]): string {
  if (!importBranch) return "";
  
  // Create mapping for common variations
  const branchMapping: Record<string, string> = {
    "Can Tho": "Cần Thơ",
    "Bac Ninh": "Bắc Ninh",
    "TW": "Taiwan",
    "Sing": "Singapore", 
    "Khác": "Khác",
    "Ho Chi Minh": "Hồ Chí Minh", 
    "Ha Noi": "Hà Nội",
    "Da Nang": "Đà Nẵng",
    // Add more mappings as needed
  };
  
  // First try direct mapping
  if (branchMapping[importBranch]) {
    const mappedName = branchMapping[importBranch];
    // Check if mapped name exists in available branches
    if (availableBranches.some(b => b.name === mappedName)) {
      return mappedName;
    }
  }
  
  // If no mapping found, try to find exact match
  if (availableBranches.some(b => b.name === importBranch)) {
    return importBranch;
  }
  
  // If still no match, return original value
  return importBranch;
}



function leadStatusColor(s: string) {
  const map: Record<string, { color: "default" | "primary" | "secondary" | "success" | "warning" | "danger"; variant: "solid" | "bordered" | "light" | "flat" | "faded" | "shadow" }> = {
    Enquiry: { color: "default", variant: "flat" },
    MQL: { color: "primary", variant: "flat" },
    SQL: { color: "secondary", variant: "flat" },
    Application: { color: "warning", variant: "flat" },
    Approved: { color: "success", variant: "flat" },
    Rejected: { color: "danger", variant: "flat" },
    Disbursed: { color: "success", variant: "solid" },
  };
  return map[s] ?? { color: "default", variant: "flat" };
}

// ─── Detail Row Helper ────────────────────────────────────────────────────────

function InfoItem({ label, value, valueClass }: { label: string; value?: string | null; valueClass?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-default-400">{label}</span>
      <span className={`text-sm ${value ? (valueClass ?? "text-foreground") : "text-default-300"}`}>
        {value || "—"}
      </span>
    </div>
  );
}

function DetailRow({
  label,
  value,
  chips,
  chipColor,
  chip,
  chipProps,
  isLink,
  valueClass,
}: {
  label: string;
  value?: string | null;
  chips?: boolean;
  chipColor?: "primary" | "secondary" | "success" | "warning" | "danger" | "default";
  chip?: boolean;
  chipProps?: { color?: "default" | "primary" | "secondary" | "success" | "warning" | "danger"; variant?: "solid" | "bordered" | "light" | "flat" | "faded" | "shadow" };
  isLink?: boolean;
  valueClass?: string;
}) {
  if (!value) return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-default-400">{label}</span>
      <span className="text-sm text-default-300">—</span>
    </div>
  );

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-default-400">{label}</span>
      {chips ? (
        <div className="flex flex-wrap gap-1">
          {value.split(", ").map((v) => (
            <Chip key={v} size="sm" variant="flat" color={chipColor ?? "default"}>{v}</Chip>
          ))}
        </div>
      ) : chip && chipProps ? (
        <Chip size="sm" {...chipProps}>{value}</Chip>
      ) : isLink ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate">{value}</a>
      ) : (
        <span className={`text-sm ${valueClass ?? "text-foreground"}`}>{value}</span>
      )}
    </div>
  );
}

// ─── Form Modal ───────────────────────────────────────────────────────────────

function LeadForm({
  initial,
  onSave,
  onCancel,
  saving,
  branches,
}: {
  initial: CustomerLeadInput;
  onSave: (data: CustomerLeadInput) => void;
  onCancel: () => void;
  saving: boolean;
  branches: Branch[];
}) {
  const [form, setForm] = useState<CustomerLeadInput>(initial);
  const [csProfiles, setCSProfiles] = useState<CSProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  // Load CS profiles when component mounts
  useEffect(() => {
    async function loadData() {
      try {
        const [profilesResult, currentUser] = await Promise.all([
          getCSProfiles(),
          getCurrentUserClient()
        ]);

        if (profilesResult.success && profilesResult.data) {
          setCSProfiles(profilesResult.data);
        }

        // Get current user's branch and set as default for new forms
        if (currentUser) {
          const userProfile = await getProfileById(currentUser.id);
          if (userProfile?.branch_id) {
            // Find the branch name from branch_id
            const userBranch = branches.find(b => b.id === userProfile.branch_id);
            if (userBranch) {
              // Set default branch if this is a new form (no initial branch)
              if (!initial.branch) {
                setForm(f => ({ ...f, branch: userBranch.name }));
              }
            }
          }
        }

        // Map branch name if it's from import data
        if (initial.branch) {
          const mappedBranch = mapBranchName(initial.branch, branches);
          if (mappedBranch !== initial.branch) {
            setForm(f => ({ ...f, branch: mappedBranch }));
          }
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoadingProfiles(false);
      }
    }
    loadData();
  }, [initial.branch, branches]);

  function set(key: keyof CustomerLeadInput, value: string | number | null) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Row 1 */}
        <Input
          type="text"
          label="Ngày (Date)"
          placeholder="dd/mm/yyyy"
          value={formatDateDisplay(form.date)}
          onChange={(e) => {
            let value = e.target.value.replace(/\D/g, ''); // Chỉ cho phép số

            // Tự động thêm dấu /
            if (value.length >= 2) {
              value = value.substring(0, 2) + '/' + value.substring(2);
            }
            if (value.length >= 5) {
              value = value.substring(0, 5) + '/' + value.substring(5, 9);
            }

            // Giới hạn 10 ký tự
            if (value.length <= 10) {
              if (value.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                // Chuyển đổi dd/mm/yyyy thành yyyy-mm-dd
                const [day, month, year] = value.split('/');
                set("date", `${year}-${month}-${day}`);
              } else {
                set("date", value);
              }
            }
          }}
        />
        <Input
          type="time"
          label="Khung giờ (Time Slot)"
          value={form.time_slot || ""}
          onChange={(e) => set("time_slot", e.target.value)}
        />
        <Select
          label="Người phụ trách (Person in Charge)"
          placeholder="-- Chọn người phụ trách --"
          selectionMode="multiple"
          selectedKeys={form.person_in_charge ? form.person_in_charge.split(", ") : []}
          onSelectionChange={(keys) => {
            const selectedArray = Array.from(keys) as string[];
            set("person_in_charge", selectedArray.join(", "));
          }}
          isLoading={loadingProfiles}
          renderValue={(items) => (
            <div className="flex flex-wrap gap-1 py-0.5">
              {items.map((item) => (
                <Chip key={item.key} size="sm" variant="flat" color="primary">
                  {item.textValue}
                </Chip>
              ))}
            </div>
          )}
        >
          {csProfiles.map((profile) => (
            <SelectItem key={profile.full_name}>
              {profile.full_name}
            </SelectItem>
          ))}
        </Select>

        {/* Row 2 */}
        <Input
          type="text"
          label="Tên Facebook"
          placeholder="Tên trên Facebook"
          value={form.facebook_name ?? ""}
          onChange={(e) => set("facebook_name", e.target.value)}
        />
        <Input
          type="text"
          label="Họ và tên khách hàng"
          isRequired
          placeholder="Nhập họ và tên"
          value={form.customer_name}
          onChange={(e) => set("customer_name", e.target.value)}
        />
        <Input
          type="url"
          label="Link khách hàng"
          placeholder="https://..."
          value={form.customer_link ?? ""}
          onChange={(e) => set("customer_link", e.target.value)}
        />

        {/* Row 3 */}
        <Input
          type="text"
          label="SĐT KH (Phone Number)"
          value={form.phone_number ?? ""}
          onChange={(e) => set("phone_number", e.target.value)}
        />
        <Select
          label="Chi nhánh (Branch)"
          placeholder="-- Chọn chi nhánh --"
          selectedKeys={form.branch ? [form.branch] : []}
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0] as string;
            set("branch", selected || "");
          }}
        >
          {branches.map((branch) => (
            <SelectItem key={branch.name}>
              {branch.name}
            </SelectItem>
          ))}
        </Select>
        <Input
          type="text"
          inputMode="numeric"
          label="Nhu cầu vay (VND)"
          placeholder="0"
          value={form.loan_amount != null ? formatCurrency(form.loan_amount) : ""}
          onChange={(e) => {
            const raw = e.target.value.replace(/\./g, "").replace(/[^0-9]/g, "");
            set("loan_amount", raw ? Number(raw) : null);
          }}
        />
        <Select
          label="Tài sản đảm bảo (Collateral Type)"
          placeholder="-- Chọn tài sản --"
          selectedKeys={form.collateral_type ? [form.collateral_type] : []}
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0] as string;
            set("collateral_type", selected || "");
          }}
        >
          {COLLATERAL_OPTIONS.map((option) => (
            <SelectItem key={option}>
              {option}
            </SelectItem>
          ))}
        </Select>
        <Select
          label="Nguồn (Source)"
          placeholder="-- Chọn nguồn --"
          selectionMode="multiple"
          selectedKeys={form.source ? form.source.split(", ") : []}
          onSelectionChange={(keys) => {
            const selectedArray = Array.from(keys) as string[];
            set("source", selectedArray.join(", "));
          }}
        >
          {SOURCE_OPTIONS.map((option) => (
            <SelectItem key={option}>
              {option}
            </SelectItem>
          ))}
        </Select>

        {/* Row 4 */}
        <Select
          label="Từ Ads (From Ads)"
          placeholder="-- Chọn --"
          selectedKeys={form.from_ads ? [form.from_ads] : []}
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0] as string;
            set("from_ads", selected || "");
          }}
        >
          {FROM_ADS_OPTIONS.map((option) => (
            <SelectItem key={option}>{option}</SelectItem>
          ))}
        </Select>
        <Select
          label="Trạng thái trao đổi (Engagement Status)"
          placeholder="-- Chọn trạng thái --"
          selectedKeys={form.engagement_status ? [form.engagement_status] : []}
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0] as string;
            set("engagement_status", selected || "");
          }}
        >
          {ENGAGEMENT_STATUS_OPTIONS.map((option) => (
            <SelectItem key={option}>{option}</SelectItem>
          ))}
        </Select>
        <Select
          label="Tiến độ hồ sơ (Case Status)"
          placeholder="-- Chọn tiến độ --"
          selectedKeys={form.case_status ? [form.case_status] : []}
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0] as string;
            set("case_status", selected || "");
          }}
        >
          {CASE_STATUS_OPTIONS.map((option) => (
            <SelectItem key={option}>{option}</SelectItem>
          ))}
        </Select>

        {/* Row 5 */}
        <Select
          label="Kết quả hồ sơ (Final Application Outcome)"
          placeholder="-- Chọn kết quả --"
          selectedKeys={form.final_outcome ? [form.final_outcome] : []}
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0] as string;
            set("final_outcome", selected || "");
          }}
        >
          {FINAL_OUTCOME_OPTIONS.map((option) => (
            <SelectItem key={option}>
              <Tooltip content={option} placement="right" delay={300} closeDelay={0}>
                <span className="block truncate max-w-[220px]">{option}</span>
              </Tooltip>
            </SelectItem>
          ))}
        </Select>
        <Select
          label="Tình trạng (Lead Status)"
          placeholder="-- Chọn tình trạng --"
          selectedKeys={form.lead_status ? [form.lead_status] : []}
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0] as string;
            set("lead_status", selected || "");
          }}
        >
          {LEAD_STATUS_OPTIONS.map((option) => (
            <SelectItem key={option}>
              {option}
            </SelectItem>
          ))}
        </Select>
        <Input
          type="text"
          inputMode="numeric"
          label="Số tiền đã giải ngân (VND)"
          placeholder="0"
          value={form.disbursed_amount != null ? formatCurrency(form.disbursed_amount) : ""}
          onChange={(e) => {
            const raw = e.target.value.replace(/\./g, "").replace(/[^0-9]/g, "");
            set("disbursed_amount", raw ? Number(raw) : null);
          }}
        />

        {/* Row 6 */}
        <Input
          type="text"
          label="Liên hệ L2"
          value={form.contact_l2 ?? ""}
          onChange={(e) => set("contact_l2", e.target.value)}
        />
        <Input
          type="text"
          label="Liên hệ L3"
          value={form.contact_l3 ?? ""}
          onChange={(e) => set("contact_l3", e.target.value)}
        />
        <Input
          type="text"
          label="Tên người giới thiệu (Referrer Name)"
          value={form.referrer_name ?? ""}
          onChange={(e) => set("referrer_name", e.target.value)}
        />

        {/* Row 7 */}
        <Input
          type="text"
          label="SĐT người giới thiệu (Referrer Phone)"
          value={form.referrer_phone ?? ""}
          onChange={(e) => set("referrer_phone", e.target.value)}
        />
      </div>

      {/* Ghi chú - Full width */}
      <div className="w-full">
        <Textarea
          label="Ghi chú (Remarks)"
          value={form.remarks ?? ""}
          onChange={(e) => set("remarks", e.target.value)}
          placeholder="Nhập ghi chú..."
          minRows={3}
          maxRows={6}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="bordered" onPress={onCancel}>
          Hủy
        </Button>
        <Button
          type="submit"
          color="primary"
          isLoading={saving}
        >
          {saving ? "Đang lưu..." : "Lưu"}
        </Button>
      </div>
    </form>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function LeadsManagerContent({
  initialLeads,
  initialTotal,
  branches,
}: {
  initialLeads: Lead[];
  initialTotal: number;
  branches: Branch[];
}) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [total, setTotal] = useState(initialTotal);
  const [stats, setStats] = useState<CustomerLeadsStats>({
    total: initialTotal,
    disbursed: 0,
    processing: 0,
    rejected: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounceValue(search, 300);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Lead | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [viewTarget, setViewTarget] = useState<Lead | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [csProfiles, setCSProfiles] = useState<CSProfile[]>([]);

  // Import states
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreviewData | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<string>("");
  const importInputRef = useRef<HTMLInputElement>(null);

  // Advanced filters - temporary state in popover
  const [tempFilters, setTempFilters] = useState<FilterState>({
    dateFrom: "",
    dateTo: "",
    branch: "all",
    leadStatus: "all",
    source: "all",
    fromAds: "all",
    engagementStatus: "all",
    caseStatus: "all",
    finalOutcome: "all",
    collateralType: "all",
    personInCharge: "all",
  });

  // Applied filters - actual filters used for fetching
  const [appliedFilters, setAppliedFilters] = useState<FilterState>({
    dateFrom: "",
    dateTo: "",
    branch: "all",
    leadStatus: "all",
    source: "all",
    fromAds: "all",
    engagementStatus: "all",
    caseStatus: "all",
    finalOutcome: "all",
    collateralType: "all",
    personInCharge: "all",
  });

  // Load CS profiles for filter
  useEffect(() => {
    async function loadProfiles() {
      const result = await getCSProfiles();
      if (result.success && result.data) {
        setCSProfiles(result.data);
      }
    }
    loadProfiles();
  }, []);

  const rowsPerPage = 10;
  const totalPages = Math.ceil(total / rowsPerPage);

  const fetchLeads = useCallback((page: number, search: string, filterState: FilterState) => {
    setIsRefreshing(true);
    startTransition(async () => {
      try {
        const filterParams = {
          search: search || undefined,
          status: filterState.leadStatus !== "all" ? filterState.leadStatus : undefined,
          source: filterState.source !== "all" ? filterState.source : undefined,
          dateFrom: filterState.dateFrom || undefined,
          dateTo: filterState.dateTo || undefined,
          branch: filterState.branch !== "all" ? filterState.branch : undefined,
          fromAds: filterState.fromAds !== "all" ? filterState.fromAds : undefined,
          engagementStatus: filterState.engagementStatus !== "all" ? filterState.engagementStatus : undefined,
          caseStatus: filterState.caseStatus !== "all" ? filterState.caseStatus : undefined,
          finalOutcome: filterState.finalOutcome !== "all" ? filterState.finalOutcome : undefined,
          collateralType: filterState.collateralType !== "all" ? filterState.collateralType : undefined,
          personInCharge: filterState.personInCharge !== "all" ? filterState.personInCharge : undefined,
        };

        // Fetch leads and stats in parallel
        const [leadsResult, statsResult] = await Promise.all([
          getCustomerLeads({
            page,
            pageSize: rowsPerPage,
            ...filterParams,
          }),
          getCustomerLeadsStats(filterParams),
        ]);

        if (leadsResult.data) setLeads(leadsResult.data as Lead[]);
        setTotal(leadsResult.count ?? 0);
        setStats(statsResult);
      } finally {
        setIsRefreshing(false);
      }
    });
  }, []);

  // Fetch khi search/filter thay đổi → reset về trang 1
  useEffect(() => {
    setCurrentPage(1);
    fetchLeads(1, debouncedSearch, appliedFilters);
  }, [debouncedSearch, appliedFilters, fetchLeads]);

  // Fetch khi chuyển trang
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchLeads(page, debouncedSearch, appliedFilters);
  };

  const reload = () => fetchLeads(currentPage, debouncedSearch, appliedFilters);

  // Apply filters
  const applyFilters = () => {
    setAppliedFilters(tempFilters);
    setIsFilterOpen(false);
  };

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (appliedFilters.dateFrom || appliedFilters.dateTo) count++;
    if (appliedFilters.branch !== "all") count++;
    if (appliedFilters.leadStatus !== "all") count++;
    if (appliedFilters.source !== "all") count++;
    if (appliedFilters.fromAds !== "all") count++;
    if (appliedFilters.engagementStatus !== "all") count++;
    if (appliedFilters.caseStatus !== "all") count++;
    if (appliedFilters.finalOutcome !== "all") count++;
    if (appliedFilters.collateralType !== "all") count++;
    if (appliedFilters.personInCharge !== "all") count++;
    return count;
  }, [appliedFilters]);

  // Get active filter labels
  const activeFilterLabels = useMemo(() => {
    const labels: string[] = [];
    if (appliedFilters.dateFrom || appliedFilters.dateTo) {
      const from = appliedFilters.dateFrom ? formatDateDisplay(appliedFilters.dateFrom) : "...";
      const to = appliedFilters.dateTo ? formatDateDisplay(appliedFilters.dateTo) : "...";
      labels.push(`Ngày: ${from} - ${to}`);
    }
    if (appliedFilters.branch !== "all") labels.push(`Chi nhánh: ${appliedFilters.branch}`);
    if (appliedFilters.leadStatus !== "all") labels.push(`Tình trạng: ${appliedFilters.leadStatus}`);
    if (appliedFilters.source !== "all") labels.push(`Nguồn: ${appliedFilters.source}`);
    if (appliedFilters.fromAds !== "all") labels.push(`Từ Ads: ${appliedFilters.fromAds}`);
    if (appliedFilters.engagementStatus !== "all") labels.push(`Trao đổi: ${appliedFilters.engagementStatus}`);
    if (appliedFilters.caseStatus !== "all") labels.push(`Tiến độ: ${appliedFilters.caseStatus}`);
    if (appliedFilters.finalOutcome !== "all") labels.push(`Kết quả: ${appliedFilters.finalOutcome}`);
    if (appliedFilters.collateralType !== "all") labels.push(`Tài sản: ${appliedFilters.collateralType}`);
    if (appliedFilters.personInCharge !== "all") {
      const person = csProfiles.find(p => p.full_name === appliedFilters.personInCharge);
      labels.push(`Phụ trách: ${person?.full_name || appliedFilters.personInCharge}`);
    }
    return labels;
  }, [appliedFilters, csProfiles]);

  const hasActiveFilters = search || activeFiltersCount > 0;

  async function handleSave(data: CustomerLeadInput) {
    if (editTarget) {
      const res = await updateCustomerLead(editTarget.id, data);
      if (res.error) return;
    } else {
      const res = await createCustomerLead(data);
      if (res.error) return;
    }
    setShowForm(false);
    setEditTarget(null);
    reload();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await deleteCustomerLead(deleteTarget.id);
    if (res.error) return;
    setDeleteTarget(null);
    reload();
  }

  const clearFilters = () => {
    setSearch("");
    const emptyFilters = {
      dateFrom: "",
      dateTo: "",
      branch: "all",
      leadStatus: "all",
      source: "all",
      fromAds: "all",
      engagementStatus: "all",
      caseStatus: "all",
      finalOutcome: "all",
      collateralType: "all",
      personInCharge: "all",
    };
    setTempFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  };

  // Open filter popover and sync temp filters with applied filters
  const handleFilterOpen = (open: boolean) => {
    if (open) {
      setTempFilters(appliedFilters); // Sync temp with applied when opening
    }
    setIsFilterOpen(open);
  };

  // ─── Import Functions ─────────────────────────────────────────────────────

  // Map branch names from import data to actual branch names
  function mapImportBranchName(importBranch: string | undefined): string {
    if (!importBranch) return "";
    
    const branchMapping: Record<string, string> = {
      // Code mapping (từ code ngắn sang tên đầy đủ)
      "HN": "Hà Nội",
      "CT": "Cần Thơ",
      "HCM": "Hồ Chí Minh", 
      "DN": "Đà Nẵng",
      
      // Text mapping (từ tên tiếng Anh sang tiếng Việt)
      "Can Tho": "Cần Thơ",
      "Bac Ninh": "Bắc Ninh",
      "TW": "Taiwan",
      "Sing": "Singapore", 
      "Khác": "Khác",
      "Ho Chi Minh": "Hồ Chí Minh", 
      "Ha Noi": "Hà Nội",
      "Da Nang": "Đà Nẵng",
    };
    
    // Return mapped name if exists, otherwise return original
    return branchMapping[importBranch] || importBranch;
  }

  async function handleImportUpload(file: File) {
    setImportLoading(true);
    setImportError(null);
    setImportPreview(null);
    setImportResult(null);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/customers/import-preview", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Lỗi không xác định");
      
      // Map branch names in preview data
      const mappedCustomers = json.customers.map((customer: CustomerLeadInput) => ({
        ...customer,
        branch: mapImportBranchName(customer.branch)
      }));
      
      setImportPreview({
        ...json,
        customers: mappedCustomers
      });
      setImportFile(file);
    } catch (e: any) {
      setImportError(e.message);
    } finally {
      setImportLoading(false);
    }
  }

  function handleImportFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleImportUpload(file);
    e.target.value = "";
  }

  function handleImportDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleImportUpload(file);
  }

  async function confirmImport() {
    if (!importPreview) return;

    setImportLoading(true);
    setImportError(null);
    setImportProgress(`Đang import ${importPreview.customers.length} khách hàng...`);

    try {
      // Use batch import API for better performance
      const res = await fetch("/api/customers/import-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customers: importPreview.customers }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || json.details || "Lỗi không xác định");
      }

      const results: ImportResult = {
        success: json.success || 0,
        failed: json.failed || 0,
        errors: json.errors || [],
      };

      setImportResult(results);
      setImportProgress("");

      // Reload data if any succeeded
      if (results.success > 0) {
        reload();
      }
    } catch (e: any) {
      setImportError(e.message);
      setImportProgress("");
    } finally {
      setImportLoading(false);
    }
  }

  function resetImport() {
    setShowImport(false);
    setImportFile(null);
    setImportPreview(null);
    setImportResult(null);
    setImportError(null);
    setImportProgress("");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="text-primary" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Quản lý Khách hàng</h1>
              <p className="text-default-500">
                {total} khách hàng
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Button
              variant="bordered"
              startContent={<RefreshCw size={16} />}
              onPress={reload}
              isLoading={isRefreshing}
            >
              Làm mới
            </Button>
            <Button
              variant="bordered"
              startContent={<Upload size={16} />}
              onPress={() => setShowImport(true)}
            >
              Import Excel
            </Button>
            <Button
              color="primary"
              startContent={<Plus size={16} />}
              onPress={() => { setEditTarget(null); setShowForm(true); }}
            >
              Thêm khách hàng
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardBody className="text-center p-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Users size={20} className="text-default-400" />
            </div>
            <p className="text-small text-default-500 uppercase font-bold">Tổng số</p>
            <p className="text-3xl font-bold">{stats.total}</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="text-center p-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp size={20} className="text-success" />
            </div>
            <p className="text-small text-default-500 uppercase font-bold">Đã giải ngân</p>
            <p className="text-3xl font-bold text-success">{stats.disbursed}</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="text-center p-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock size={20} className="text-warning" />
            </div>
            <p className="text-small text-default-500 uppercase font-bold">Đang xử lý</p>
            <p className="text-3xl font-bold text-warning">{stats.processing}</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="text-center p-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <X size={20} className="text-danger" />
            </div>
            <p className="text-small text-default-500 uppercase font-bold">Từ chối</p>
            <p className="text-3xl font-bold text-danger">{stats.rejected}</p>
          </CardBody>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="flex flex-col gap-4">
            {/* Search and Filter Button */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Tìm kiếm theo tên Facebook, họ và tên, SĐT, người phụ trách..."
                value={search}
                onValueChange={setSearch}
                startContent={<Search size={16} className="text-default-400" />}
                className="flex-1"
                isClearable
              />

              <Popover
                isOpen={isFilterOpen}
                onOpenChange={handleFilterOpen}
                placement="bottom-end"
              >
                <PopoverTrigger>
                  <Button
                    variant={activeFiltersCount > 0 ? "solid" : "bordered"}
                    color={activeFiltersCount > 0 ? "primary" : "default"}
                    startContent={<Filter size={16} />}
                    endContent={activeFiltersCount > 0 ? (
                      <Chip size="sm" color="primary" variant="solid">{activeFiltersCount}</Chip>
                    ) : <ChevronDown size={16} />}
                    className="min-w-[140px]"
                  >
                    Bộ lọc
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-default-200">
                      <h4 className="text-lg font-semibold">Bộ lọc chi tiết</h4>
                      {activeFiltersCount > 0 && (
                        <Button
                          size="sm"
                          variant="light"
                          color="danger"
                          onPress={clearFilters}
                          startContent={<X size={14} />}
                        >
                          Xóa tất cả
                        </Button>
                      )}
                    </div>

                    {/* Date Range */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-default-700">Khoảng thời gian</label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="date"
                          label="Từ ngày"
                          labelPlacement="outside"
                          size="sm"
                          value={tempFilters.dateFrom}
                          onChange={(e) => setTempFilters(f => ({ ...f, dateFrom: e.target.value }))}
                        />
                        <Input
                          type="date"
                          label="Đến ngày"
                          labelPlacement="outside"
                          size="sm"
                          value={tempFilters.dateTo}
                          onChange={(e) => setTempFilters(f => ({ ...f, dateTo: e.target.value }))}
                        />
                      </div>
                    </div>

                    {/* Branch */}
                    <Select
                      label="Chi nhánh"
                      size="sm"
                      selectedKeys={tempFilters.branch !== "all" ? [tempFilters.branch] : []}
                      onSelectionChange={(keys) => {
                        const selected = Array.from(keys)[0] as string;
                        setTempFilters(f => ({ ...f, branch: selected || "all" }));
                      }}
                    >
                      {[{ key: "all", label: "Tất cả chi nhánh" }, ...branches.map(b => ({ key: b.name, label: b.name }))].map((item) => (
                        <SelectItem key={item.key}>{item.label}</SelectItem>
                      ))}
                    </Select>

                    {/* Lead Status */}
                    <Select
                      label="Tình trạng"
                      size="sm"
                      selectedKeys={tempFilters.leadStatus !== "all" ? [tempFilters.leadStatus] : []}
                      onSelectionChange={(keys) => {
                        const selected = Array.from(keys)[0] as string;
                        setTempFilters(f => ({ ...f, leadStatus: selected || "all" }));
                      }}
                    >
                      {[{ key: "all", label: "Tất cả tình trạng" }, ...LEAD_STATUS_OPTIONS.map(s => ({ key: s, label: s }))].map((item) => (
                        <SelectItem key={item.key}>{item.label}</SelectItem>
                      ))}
                    </Select>

                    {/* Source */}
                    <Select
                      label="Nguồn"
                      size="sm"
                      selectedKeys={tempFilters.source !== "all" ? [tempFilters.source] : []}
                      onSelectionChange={(keys) => {
                        const selected = Array.from(keys)[0] as string;
                        setTempFilters(f => ({ ...f, source: selected || "all" }));
                      }}
                    >
                      {[{ key: "all", label: "Tất cả nguồn" }, ...SOURCE_OPTIONS.map(s => ({ key: s, label: s }))].map((item) => (
                        <SelectItem key={item.key}>{item.label}</SelectItem>
                      ))}
                    </Select>

                    {/* From Ads */}
                    <Select
                      label="Từ Ads"
                      size="sm"
                      selectedKeys={tempFilters.fromAds !== "all" ? [tempFilters.fromAds] : []}
                      onSelectionChange={(keys) => {
                        const selected = Array.from(keys)[0] as string;
                        setTempFilters(f => ({ ...f, fromAds: selected || "all" }));
                      }}
                    >
                      {[{ key: "all", label: "Tất cả" }, ...FROM_ADS_OPTIONS.map(o => ({ key: o, label: o }))].map((item) => (
                        <SelectItem key={item.key}>{item.label}</SelectItem>
                      ))}
                    </Select>

                    {/* Engagement Status */}
                    <Select
                      label="Trạng thái trao đổi"
                      size="sm"
                      selectedKeys={tempFilters.engagementStatus !== "all" ? [tempFilters.engagementStatus] : []}
                      onSelectionChange={(keys) => {
                        const selected = Array.from(keys)[0] as string;
                        setTempFilters(f => ({ ...f, engagementStatus: selected || "all" }));
                      }}
                    >
                      {[{ key: "all", label: "Tất cả" }, ...ENGAGEMENT_STATUS_OPTIONS.map(o => ({ key: o, label: o }))].map((item) => (
                        <SelectItem key={item.key}>{item.label}</SelectItem>
                      ))}
                    </Select>

                    {/* Case Status */}
                    <Select
                      label="Tiến độ hồ sơ"
                      size="sm"
                      selectedKeys={tempFilters.caseStatus !== "all" ? [tempFilters.caseStatus] : []}
                      onSelectionChange={(keys) => {
                        const selected = Array.from(keys)[0] as string;
                        setTempFilters(f => ({ ...f, caseStatus: selected || "all" }));
                      }}
                    >
                      {[{ key: "all", label: "Tất cả" }, ...CASE_STATUS_OPTIONS.map(o => ({ key: o, label: o }))].map((item) => (
                        <SelectItem key={item.key}>{item.label}</SelectItem>
                      ))}
                    </Select>

                    {/* Final Outcome */}
                    <Select
                      label="Kết quả hồ sơ"
                      size="sm"
                      selectedKeys={tempFilters.finalOutcome !== "all" ? [tempFilters.finalOutcome] : []}
                      onSelectionChange={(keys) => {
                        const selected = Array.from(keys)[0] as string;
                        setTempFilters(f => ({ ...f, finalOutcome: selected || "all" }));
                      }}
                    >
                      {[{ key: "all", label: "Tất cả" }, ...FINAL_OUTCOME_OPTIONS.map(o => ({ key: o, label: o }))].map((item) => (
                        <SelectItem key={item.key}>{item.label}</SelectItem>
                      ))}
                    </Select>

                    {/* Collateral Type */}
                    <Select
                      label="Tài sản đảm bảo"
                      size="sm"
                      selectedKeys={tempFilters.collateralType !== "all" ? [tempFilters.collateralType] : []}
                      onSelectionChange={(keys) => {
                        const selected = Array.from(keys)[0] as string;
                        setTempFilters(f => ({ ...f, collateralType: selected || "all" }));
                      }}
                    >
                      {[{ key: "all", label: "Tất cả" }, ...COLLATERAL_OPTIONS.map(o => ({ key: o, label: o }))].map((item) => (
                        <SelectItem key={item.key}>{item.label}</SelectItem>
                      ))}
                    </Select>

                    {/* Person in Charge */}
                    <Select
                      label="Người phụ trách"
                      size="sm"
                      selectedKeys={tempFilters.personInCharge !== "all" ? [tempFilters.personInCharge] : []}
                      onSelectionChange={(keys) => {
                        const selected = Array.from(keys)[0] as string;
                        setTempFilters(f => ({ ...f, personInCharge: selected || "all" }));
                      }}
                    >
                      {[{ key: "all", label: "Tất cả" }, ...csProfiles.map(p => ({ key: p.full_name, label: p.full_name }))].map((item) => (
                        <SelectItem key={item.key}>{item.label}</SelectItem>
                      ))}
                    </Select>

                    <Button
                      color="primary"
                      className="w-full"
                      onPress={applyFilters}
                    >
                      Áp dụng bộ lọc
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              {hasActiveFilters && (
                <Button
                  variant="flat"
                  color="danger"
                  startContent={<X size={16} />}
                  onPress={clearFilters}
                >
                  Xóa bộ lọc
                </Button>
              )}
            </div>

            {/* Active Filters Display */}
            {activeFilterLabels.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-default-200">
                <span className="text-sm text-default-500 font-medium">Đang lọc:</span>
                {activeFilterLabels.map((label, index) => (
                  <Chip
                    key={index}
                    size="sm"
                    variant="flat"
                    color="primary"
                    onClose={() => {
                      // Handle individual filter removal
                      if (label.startsWith("Ngày:")) {
                        setAppliedFilters(f => ({ ...f, dateFrom: "", dateTo: "" }));
                      } else if (label.startsWith("Chi nhánh:")) {
                        setAppliedFilters(f => ({ ...f, branch: "all" }));
                      } else if (label.startsWith("Tình trạng:")) {
                        setAppliedFilters(f => ({ ...f, leadStatus: "all" }));
                      } else if (label.startsWith("Nguồn:")) {
                        setAppliedFilters(f => ({ ...f, source: "all" }));
                      } else if (label.startsWith("Từ Ads:")) {
                        setAppliedFilters(f => ({ ...f, fromAds: "all" }));
                      } else if (label.startsWith("Trao đổi:")) {
                        setAppliedFilters(f => ({ ...f, engagementStatus: "all" }));
                      } else if (label.startsWith("Tiến độ:")) {
                        setAppliedFilters(f => ({ ...f, caseStatus: "all" }));
                      } else if (label.startsWith("Kết quả:")) {
                        setAppliedFilters(f => ({ ...f, finalOutcome: "all" }));
                      } else if (label.startsWith("Tài sản:")) {
                        setAppliedFilters(f => ({ ...f, collateralType: "all" }));
                      } else if (label.startsWith("Phụ trách:")) {
                        setAppliedFilters(f => ({ ...f, personInCharge: "all" }));
                      }
                    }}
                  >
                    {label}
                  </Chip>
                ))}
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Form modal */}
      <Modal
        isOpen={showForm}
        onOpenChange={(open) => {
          if (!open) {
            setShowForm(false);
            setEditTarget(null);
          }
        }}
        size="5xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              {editTarget ? <Edit size={20} className="text-primary" /> : <Plus size={20} className="text-primary" />}
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {editTarget ? "Chỉnh sửa khách hàng" : "Thêm khách hàng mới"}
              </h3>
              <p className="text-sm text-default-500">
                {editTarget ? "Cập nhật thông tin khách hàng" : "Nhập thông tin khách hàng mới"}
              </p>
            </div>
          </ModalHeader>
          <ModalBody>
            <LeadForm
              initial={editTarget ? { ...editTarget } : EMPTY_FORM}
              onSave={handleSave}
              onCancel={() => { setShowForm(false); setEditTarget(null); }}
              saving={isPending}
              branches={branches}
            />
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Delete confirm */}
      <Modal
        isOpen={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        size="sm"
      >
        <ModalContent>
          <ModalHeader className="flex items-center gap-3">
            <div className="p-2 bg-danger/10 rounded-lg">
              <Trash2 size={20} className="text-danger" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Xác nhận xóa</h3>
              <p className="text-sm text-default-500">Hành động này không thể hoàn tác</p>
            </div>
          </ModalHeader>
          <ModalBody>
            <p className="text-default-600">
              Bạn có chắc muốn xóa khách hàng{" "}
              <span className="font-medium text-foreground">{deleteTarget?.customer_name}</span>?
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="bordered" onPress={() => setDeleteTarget(null)}>
              Hủy
            </Button>
            <Button
              color="danger"
              onPress={handleDelete}
              isLoading={isPending}
            >
              Xóa
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Import Modal */}
      <Modal
        isOpen={showImport}
        onOpenChange={(open) => {
          if (!open) resetImport();
        }}
        size="3xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader className="flex items-center gap-3">
            <div className="p-2 bg-secondary/10 rounded-lg">
              <FileSpreadsheet size={20} className="text-secondary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Import dữ liệu từ Excel</h3>
              <p className="text-sm text-default-500">
                {importResult ? "Kết quả import" : importPreview ? "Xem trước dữ liệu" : "Tải file Excel lên"}
              </p>
            </div>
          </ModalHeader>
          <ModalBody>
            {/* Upload Zone */}
            {!importPreview && !importResult && (
              <div
                onDrop={handleImportDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => importInputRef.current?.click()}
                className="border-2 border-dashed border-default-300 rounded-xl p-12 text-center cursor-pointer hover:border-secondary hover:bg-secondary/5 transition-colors"
              >
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleImportFileChange}
                />
                <Upload size={48} className="mx-auto text-default-300 mb-4" />
                <p className="font-medium text-lg mb-2">
                  {importFile ? `Đã chọn: ${importFile.name}` : "Kéo thả file vào đây hoặc click để chọn"}
                </p>
                <p className="text-default-400 text-sm">Hỗ trợ .xlsx, .xls</p>
              </div>
            )}

            {importLoading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary mx-auto mb-4"></div>
                <p className="text-default-500">{importProgress || "Đang xử lý file..."}</p>
              </div>
            )}

            {importError && (
              <div className="bg-danger-50 text-danger border border-danger-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium mb-1">Lỗi khi xử lý file</p>
                  <p className="text-sm">{importError}</p>
                </div>
              </div>
            )}

            {/* Preview */}
            {importPreview && !importResult && (
              <div className="space-y-4">
                <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <FileSpreadsheet size={20} className="text-secondary" />
                    <div>
                      <p className="font-medium">Sheet: {importPreview.sheet}</p>
                      <p className="text-sm text-default-500">
                        Tìm thấy {importPreview.total} khách hàng hợp lệ
                        {importPreview.skipped && importPreview.skipped > 0 && (
                          <span className="text-warning"> (đã bỏ qua {importPreview.skipped} dòng)</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-default-600">
                    <p className="mb-2">Dữ liệu sẽ được import vào hệ thống. Chi nhánh đã được tự động mapping.</p>
                    {importPreview.message && (
                      <p className="text-warning font-medium">⚠️ {importPreview.message}</p>
                    )}
                  </div>
                </div>

                {/* Preview Table */}
                <div className="border border-default-200 rounded-lg overflow-hidden">
                  <div className="bg-default-100 px-4 py-2 font-medium text-sm">
                    Xem trước {Math.min(5, importPreview.customers.length)} khách hàng đầu tiên
                  </div>
                  <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-default-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-default-600">#</th>
                          <th className="px-3 py-2 text-left font-medium text-default-600">Ngày</th>
                          <th className="px-3 py-2 text-left font-medium text-default-600">Tên khách hàng</th>
                          <th className="px-3 py-2 text-left font-medium text-default-600">SĐT</th>
                          <th className="px-3 py-2 text-left font-medium text-default-600">Chi nhánh</th>
                          <th className="px-3 py-2 text-left font-medium text-default-600">Nguồn</th>
                          <th className="px-3 py-2 text-left font-medium text-default-600">Tình trạng</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.customers.slice(0, 5).map((customer, i) => (
                          <tr key={i} className="border-t border-default-100">
                            <td className="px-3 py-2">{i + 1}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{formatDateDisplay(customer.date)}</td>
                            <td className="px-3 py-2 font-medium">{customer.customer_name}</td>
                            <td className="px-3 py-2">{customer.phone_number || "—"}</td>
                            <td className="px-3 py-2">
                              <Chip size="sm" variant="flat" color="primary">
                                {customer.branch || "—"}
                              </Chip>
                            </td>
                            <td className="px-3 py-2">{customer.source || "—"}</td>
                            <td className="px-3 py-2">
                              {customer.lead_status ? (
                                <Chip size="sm" {...leadStatusColor(customer.lead_status)}>
                                  {customer.lead_status}
                                </Chip>
                              ) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {importPreview.customers.length > 5 && (
                    <div className="bg-default-50 px-4 py-2 text-sm text-default-500 text-center">
                      ... và {importPreview.customers.length - 5} khách hàng khác
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Result */}
            {importResult && (
              <div className="space-y-4">
                <div className={`border rounded-lg p-4 ${importResult.failed === 0
                    ? "bg-success-50 border-success-200"
                    : "bg-warning-50 border-warning-200"
                  }`}>
                  <div className="flex items-start gap-3">
                    {importResult.failed === 0 ? (
                      <CheckCircle2 size={24} className="text-success flex-shrink-0" />
                    ) : (
                      <AlertCircle size={24} className="text-warning flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-lg mb-2">
                        {importResult.failed === 0
                          ? "Import thành công!"
                          : "Import hoàn tất với một số lỗi"}
                      </p>
                      <div className="space-y-1 text-sm">
                        <p className="text-success">
                          ✓ Thành công: <span className="font-semibold">{importResult.success}</span> khách hàng
                        </p>
                        {importResult.failed > 0 && (
                          <p className="text-danger">
                            ✗ Thất bại: <span className="font-semibold">{importResult.failed}</span> khách hàng
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="border border-danger-200 rounded-lg overflow-hidden">
                    <div className="bg-danger-50 px-4 py-2 font-medium text-sm text-danger">
                      Chi tiết lỗi
                    </div>
                    <div className="max-h-[200px] overflow-y-auto">
                      <ul className="divide-y divide-default-100">
                        {importResult.errors.map((error, i) => (
                          <li key={i} className="px-4 py-2 text-sm text-default-600">
                            {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            {!importResult && (
              <>
                <Button variant="bordered" onPress={resetImport}>
                  Hủy
                </Button>
                {importPreview && (
                  <Button
                    color="secondary"
                    onPress={confirmImport}
                    isLoading={importLoading}
                    startContent={<CheckCircle2 size={16} />}
                  >
                    Xác nhận Import
                  </Button>
                )}
              </>
            )}
            {importResult && (
              <Button color="primary" onPress={resetImport}>
                Đóng
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Table */}
      <Card>
        <CardBody className="p-0">
          <div className="overflow-x-scroll w-full [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-default-100 [&::-webkit-scrollbar-thumb]:bg-default-300 [&::-webkit-scrollbar-thumb]:rounded-full">
            <Table
              aria-label="Customers table"
              classNames={{
                wrapper: "min-h-[400px] overflow-visible shadow-none rounded-none",
                table: "min-w-[900px]",
              }}
            >
              <TableHeader>
                <TableColumn key="date">NGÀY</TableColumn>
                <TableColumn key="person_in_charge">NGƯỜI PHỤ TRÁCH</TableColumn>
                <TableColumn key="facebook_name">TÊN FACEBOOK</TableColumn>
                <TableColumn key="final_outcome" className="w-[220px] max-w-[220px]">
                  KẾT QUẢ HỒ SƠ
                </TableColumn>
                <TableColumn key="phone_number">SỐ ĐIỆN THOẠI</TableColumn>
                <TableColumn key="branch">CHI NHÁNH</TableColumn>
                <TableColumn key="source">NGUỒN</TableColumn>
                <TableColumn key="case_status">TIẾN ĐỘ</TableColumn>
                <TableColumn key="lead_status">TÌNH TRẠNG</TableColumn>
                <TableColumn key="actions">THAO TÁC</TableColumn>
              </TableHeader>
              <TableBody
                items={leads}
                isLoading={isPending || isRefreshing}
                loadingContent={<Skeleton className="w-full h-8" />}
                emptyContent={
                  <div className="text-center py-8">
                    <Users size={48} className="mx-auto text-default-300 mb-4" />
                    <p className="text-default-500 mb-4">
                      {total === 0 ? "Chưa có khách hàng nào" : "Không tìm thấy kết quả"}
                    </p>
                    {total === 0 && (
                      <Button
                        color="primary"
                        startContent={<Plus size={16} />}
                        onPress={() => { setEditTarget(null); setShowForm(true); }}
                      >
                        Thêm khách hàng đầu tiên
                      </Button>
                    )}
                  </div>
                }
              >
                {(item) => (
                  <TableRow key={item.id} className="hover:bg-default-50">
                    <TableCell>
                      <span className="text-sm whitespace-nowrap">{formatDateDisplay(item.date) || "—"}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex flex-nowrap gap-1 items-center">
                        {item.person_in_charge
                          ? item.person_in_charge.split(", ").map((name, i) => (
                            <Chip key={`${name}-${i}`} size="sm" variant="flat" color="primary">
                              {name}
                            </Chip>
                          ))
                          : <span className="text-default-300">—</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium whitespace-nowrap">
                        {item.customer_link ? (
                          <a href={item.customer_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            {item.facebook_name || "—"}
                          </a>
                        ) : (item.facebook_name || "—")}
                      </span>
                    </TableCell>
                    <TableCell className="w-[120px] max-w-[120px] align-top">
                      {item.final_outcome ? (
                        <Tooltip
                          content={item.final_outcome}
                          placement="top"
                          delay={200}
                          closeDelay={0}
                          classNames={{
                            content: "max-w-sm whitespace-normal text-small py-2 px-3",
                          }}
                        >
                          <div
                            tabIndex={0}
                            className="text-sm truncate min-w-0 cursor-default outline-none"
                          >
                            {item.final_outcome}
                          </div>
                        </Tooltip>
                      ) : (
                        <span className="text-default-300">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-default-400" />
                        <span className="font-mono whitespace-nowrap">{item.phone_number || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm whitespace-nowrap">{item.branch || "—"}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {(() => {
                        const sources = item.source
                          ? item.source.split(", ").map((s) => s.trim()).filter(Boolean)
                          : [];
                        if (sources.length === 0) {
                          return <span className="text-default-300">—</span>;
                        }
                        
                        // Hiển thị tối đa 1 chip đầu tiên
                        const firstSource = sources[0];
                        const remainingCount = sources.length - 1;
                        
                        return (
                          <div className="flex flex-nowrap gap-1 items-center">
                            <Chip size="sm" variant="flat" color="secondary">
                              {firstSource}
                            </Chip>
                            {remainingCount > 0 && (
                              <Tooltip
                                content={
                                  <div className="flex flex-wrap gap-1 max-w-xs">
                                    <div className="text-xs text-default-500 mb-1 w-full">Tất cả nguồn:</div>
                                    {sources.map((src, i) => (
                                      <Chip key={`${src}-${i}`} size="sm" variant="flat" color="secondary">
                                        {src}
                                      </Chip>
                                    ))}
                                  </div>
                                }
                                placement="top"
                                delay={200}
                                closeDelay={0}
                                classNames={{ content: "p-2" }}
                              >
                                <Chip size="sm" variant="flat" color="default" className="cursor-help">
                                  +{remainingCount}
                                </Chip>
                              </Tooltip>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm whitespace-nowrap">{item.case_status || "—"}</span>
                    </TableCell>
                    <TableCell>
                      {item.lead_status ? (
                        <Chip size="sm" {...leadStatusColor(item.lead_status)}>{item.lead_status}</Chip>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Tooltip content="Xem chi tiết">
                          <Button size="sm" variant="light" isIconOnly onPress={() => setViewTarget(item)}>
                            <Eye size={16} />
                          </Button>
                        </Tooltip>
                        <Tooltip content="Chỉnh sửa">
                          <Button size="sm" variant="light" isIconOnly onPress={() => { setEditTarget(item); setShowForm(true); }}>
                            <Edit size={16} />
                          </Button>
                        </Tooltip>
                        <Tooltip content="Xóa" color="danger">
                          <Button size="sm" variant="light" color="danger" isIconOnly onPress={() => setDeleteTarget(item)}>
                            <Trash2 size={16} />
                          </Button>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardBody>
      </Card>

      {/* Detail Modal */}
      <Modal
        isOpen={!!viewTarget}
        onOpenChange={(open) => { if (!open) setViewTarget(null); }}
        size="lg"
        scrollBehavior="inside"
      >
        <ModalContent>
          {viewTarget && (
            <>
              <ModalHeader className="pb-0">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold">
                      {viewTarget.customer_link ? (
                        <a href={viewTarget.customer_link} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                          {viewTarget.customer_name}
                        </a>
                      ) : viewTarget.customer_name}
                    </h3>
                    {viewTarget.lead_status && (
                      <Chip size="sm" {...leadStatusColor(viewTarget.lead_status)}>{viewTarget.lead_status}</Chip>
                    )}
                  </div>
                  {viewTarget.facebook_name && (
                    <p className="text-sm text-default-500">
                      Tên Facebook: <span className="font-medium">{viewTarget.facebook_name}</span>
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-sm text-default-500">
                    {viewTarget.phone_number && (
                      <span className="flex items-center gap-1">
                        <Phone size={13} />
                        {viewTarget.phone_number}
                      </span>
                    )}
                    {viewTarget.branch && (
                      <span className="flex items-center gap-1">
                        <MapPin size={13} />
                        {viewTarget.branch}
                      </span>
                    )}
                    {viewTarget.date && (
                      <span className="flex items-center gap-1">
                        <Calendar size={13} />
                        {formatDateDisplay(viewTarget.date)}{viewTarget.time_slot ? ` · ${viewTarget.time_slot}` : ""}
                      </span>
                    )}
                  </div>
                </div>
              </ModalHeader>

              <ModalBody className="py-4 gap-3">
                {/* Người phụ trách */}
                {viewTarget.person_in_charge && (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-default-400">Người phụ trách</span>
                    <div className="flex flex-wrap gap-1">
                      {viewTarget.person_in_charge.split(", ").map((n) => (
                        <Chip key={n} size="sm" variant="flat" color="primary">{n}</Chip>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hồ sơ vay */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <InfoItem label="Nhu cầu vay" value={viewTarget.loan_amount ? fmtNum(viewTarget.loan_amount) + " ₫" : null} valueClass="font-semibold" />
                  <InfoItem label="Tài sản đảm bảo" value={viewTarget.collateral_type} />
                  <InfoItem label="Tiến độ hồ sơ" value={viewTarget.case_status} />
                  <InfoItem label="Kết quả hồ sơ" value={viewTarget.final_outcome} />
                  {viewTarget.disbursed_amount ? (
                    <InfoItem label="Đã giải ngân" value={fmtNum(viewTarget.disbursed_amount) + " ₫"} valueClass="text-success font-semibold" />
                  ) : null}
                </div>

                <div className="border-t border-default-100" />

                {/* Nguồn */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-default-400">Nguồn</span>
                  <div className="flex flex-wrap gap-1">
                    {viewTarget.source
                      ? viewTarget.source.split(", ").map((s) => (
                        <Chip key={s} size="sm" variant="flat" color="secondary">{s}</Chip>
                      ))
                      : <span className="text-sm text-default-300">—</span>}
                  </div>
                </div>

                {(viewTarget.from_ads || viewTarget.engagement_status) && (
                  <div className="grid grid-cols-2 gap-x-6">
                    <InfoItem label="Từ Ads" value={viewTarget.from_ads} />
                    <InfoItem label="Trạng thái trao đổi" value={viewTarget.engagement_status} />
                  </div>
                )}

                {/* Giới thiệu */}
                {(viewTarget.referrer_name || viewTarget.referrer_phone || viewTarget.contact_l2 || viewTarget.contact_l3) && (
                  <>
                    <div className="border-t border-default-100" />
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                      <InfoItem label="Người giới thiệu" value={viewTarget.referrer_name} />
                      <InfoItem label="SĐT giới thiệu" value={viewTarget.referrer_phone} />
                      <InfoItem label="Liên hệ L2" value={viewTarget.contact_l2} />
                      <InfoItem label="Liên hệ L3" value={viewTarget.contact_l3} />
                    </div>
                  </>
                )}

                {/* Ghi chú */}
                {viewTarget.remarks && (
                  <div className="rounded-xl border border-default-200 p-3">
                    <p className="text-xs text-default-400 mb-1.5">Ghi chú</p>
                    <p className="text-sm whitespace-pre-wrap">{viewTarget.remarks}</p>
                  </div>
                )}
              </ModalBody>

              <ModalFooter className="pt-2">
                <Button variant="light" onPress={() => setViewTarget(null)}>Đóng</Button>
                <Button color="primary" startContent={<Edit size={15} />} onPress={() => { setEditTarget(viewTarget); setViewTarget(null); setShowForm(true); }}>
                  Chỉnh sửa
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            total={totalPages}
            page={currentPage}
            onChange={handlePageChange}
            showControls
            showShadow
            color="primary"
          />
        </div>
      )}

      {/* Results Info */}
      <Card>
        <CardBody>
          <p className="text-small text-default-400 text-center">
            Trang {currentPage}/{totalPages || 1} — {leads.length} bản ghi / {total} tổng
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
