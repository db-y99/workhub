"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Select, SelectItem } from "@heroui/select";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Pagination } from "@heroui/pagination";
import { Spinner } from "@heroui/spinner";
import { Facebook, MessageCircle, Phone, RefreshCw, Search } from "lucide-react";
import type { Message, Platform } from "@/lib/actions/messages";

const PLATFORM_CONFIG: Record<Platform, { label: string; color: "primary" | "success" | "warning"; icon: React.ReactNode }> = {
  facebook: { label: "Facebook", color: "primary", icon: <Facebook size={14} /> },
  whatsapp: { label: "WhatsApp", color: "success", icon: <Phone size={14} /> },
  zalo: { label: "Zalo", color: "warning", icon: <MessageCircle size={14} /> },
};

const PAGE_SIZE = 20;

export default function MessagesContent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Record<string, number>>({});

  const [platform, setPlatform] = useState<Platform | "">("");
  const [campaignId, setCampaignId] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (platform) params.set("platform", platform);
      if (campaignId) params.set("campaign_id", campaignId);

      const res = await fetch(`/api/messages?${params}`);
      const json = await res.json();
      setMessages(json.data ?? []);
      setTotal(json.total ?? 0);
      setStats(json.stats ?? {});
    } finally {
      setLoading(false);
    }
  }, [page, platform, campaignId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tin nhắn</h1>
          <p className="text-sm text-default-500 mt-1">Tổng hợp tin nhắn từ Facebook, WhatsApp, Zalo</p>
        </div>
        <Button isIconOnly variant="flat" onPress={fetchData} aria-label="Làm mới">
          <RefreshCw size={18} />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {(["facebook", "whatsapp", "zalo"] as Platform[]).map((p) => {
          const cfg = PLATFORM_CONFIG[p];
          return (
            <Card key={p} className="border border-default-200/50">
              <CardBody className="flex flex-row items-center gap-3 p-4">
                <Chip color={cfg.color} variant="flat" startContent={cfg.icon} size="sm">
                  {cfg.label}
                </Chip>
                <span className="text-2xl font-bold">{stats[p] ?? 0}</span>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="border border-default-200/50">
        <CardBody className="flex flex-row flex-wrap gap-3 p-4">
          <Select
            label="Nền tảng"
            size="sm"
            className="w-40"
            selectedKeys={platform ? [platform] : []}
            onSelectionChange={(keys) => { const arr = Array.from(keys); setPlatform((arr[0] ?? "") as Platform | ""); setPage(1); }}
          >
            <SelectItem key="">Tất cả</SelectItem>
            <SelectItem key="facebook">Facebook</SelectItem>
            <SelectItem key="whatsapp">WhatsApp</SelectItem>
            <SelectItem key="zalo">Zalo</SelectItem>
          </Select>
          <Input
            label="Campaign ID"
            size="sm"
            className="w-48"
            value={campaignId}
            onValueChange={(v) => { setCampaignId(v); setPage(1); }}
            startContent={<Search size={14} />}
            isClearable
          />
        </CardBody>
      </Card>

      {/* Table */}
      <Card className="border border-default-200/50">
        <CardHeader className="px-4 py-3 border-b border-divider">
          <span className="text-sm text-default-500">{total} tin nhắn</span>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : messages.length === 0 ? (
            <p className="text-center text-default-400 py-12 text-sm">Chưa có tin nhắn nào</p>
          ) : (
            <div className="divide-y divide-divider">
              {messages.map((msg) => {
                const cfg = PLATFORM_CONFIG[msg.platform];
                return (
                  <div key={msg.id} className="flex items-start gap-3 px-4 py-3 hover:bg-default-50 transition-colors">
                    <Chip color={cfg.color} variant="flat" size="sm" startContent={cfg.icon} className="shrink-0 mt-0.5">
                      {cfg.label}
                    </Chip>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{msg.message_content ?? <span className="text-default-400 italic">Không có nội dung</span>}</p>
                      <div className="flex flex-wrap gap-2 mt-1 text-xs text-default-400">
                        {(msg.user_id || msg.phone) && (
                          <span>{msg.user_id ?? msg.phone}</span>
                        )}
                        {msg.campaign_id && (
                          <span className="text-primary">#{msg.campaign_id}</span>
                        )}
                        <span>{new Date(msg.timestamp).toLocaleString("vi-VN")}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination total={totalPages} page={page} onChange={setPage} />
        </div>
      )}
    </div>
  );
}
