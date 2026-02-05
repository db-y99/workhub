"use client";

import { useState } from "react";
import useSWR from "swr";
import { Megaphone, Plus, Paperclip, Edit } from "lucide-react";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Tooltip } from "@heroui/tooltip";
import { Button } from "@heroui/button";
import { BulletinDetailModal } from "./bulletin-detail-modal";
import { EditBulletinModal } from "./edit-bulletin-modal";
import { useAuth } from "@/lib/contexts/auth-context";
import type { TBulletinItem } from "@/types/bulletin.types";

const BULLETIN_GRADIENTS = [
  "from-rose-400/80 to-pink-500/90",
  "from-sky-300/80 to-blue-500/90",
  "from-emerald-400/80 to-teal-500/90",
  "from-amber-400/80 to-orange-500/90",
  "from-violet-400/80 to-purple-500/90",
  "from-indigo-400/80 to-blue-600/90",
  "from-slate-300/80 to-slate-500/80",
  "from-cyan-300/80 to-blue-500/90",
];

const fetcher = (url: string) =>
  fetch(url).then((r) => r.json()) as Promise<{ bulletins: TBulletinItem[] }>;

type BulletinBoardProps = {
  items?: TBulletinItem[];
  onAddNews?: () => void;
  showTitle?: boolean;
};

export function BulletinBoard({
  items: itemsProp,
  onAddNews,
  showTitle = true,
}: BulletinBoardProps) {
  const [selectedBulletin, setSelectedBulletin] = useState<TBulletinItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editBulletin, setEditBulletin] = useState<TBulletinItem | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const { isAdmin } = useAuth();

  const { data } = useSWR<{ bulletins: TBulletinItem[] }>(
    "/api/bulletins",
    fetcher
  );
  const items = itemsProp ?? data?.bulletins ?? [];

  const handleBulletinClick = (item: TBulletinItem) => {
    setSelectedBulletin(item);
    setDetailOpen(true);
  };

  const handleEditClick = (item: TBulletinItem) => {
    setEditBulletin(item);
    setEditModalOpen(true);
  };

  return (
    <section className="mb-6 w-full max-w-full">
      {showTitle && (
        <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
          <Megaphone className="text-default-500" size={24} />
          Bảng tin công ty
        </h2>
      )}
      <div
        className="bulletin-scroll-x w-full pb-3"
        style={{ overscrollBehaviorX: "contain" }}
      >
        <div className="flex flex-nowrap gap-4 w-max">
          <Card
            isPressable
            onPress={onAddNews}
            className="w-[260px] min-w-[260px] h-[180px] shrink-0 border-2 border-dashed border-default-300 bg-default-50/50 hover:border-primary hover:bg-default-100/80 transition-colors"
          >
            <CardBody className="flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Plus className="text-primary" size={24} />
                </div>
                <span className="text-primary font-medium">Thêm Tin</span>
              </div>
            </CardBody>
          </Card>

          {items.map((item) => (
            <div
              key={item.id}
              className="w-[260px] min-w-[260px] h-[180px] shrink-0 relative cursor-pointer"
              onClick={() => handleBulletinClick(item)}
            >
              <Card className="w-full h-full overflow-hidden">
                {isAdmin && (
                  <div
                    className="absolute top-2 right-2 z-10"
                    onClick={(e) => {
                      e.stopPropagation(); // Ngăn không cho trigger click vào card
                    }}
                  >
                    <Button
                      isIconOnly
                      size="sm"
                      variant="solid"
                      className="bg-white/20 hover:bg-white/30 text-white border-0 min-w-8 w-8 h-8"
                      onPress={() => handleEditClick(item)}
                      aria-label="Sửa bảng tin"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <CardBody
                  className={`bg-gradient-to-br ${item.gradient || BULLETIN_GRADIENTS[0]} p-4 text-white flex flex-col justify-between h-full`}
                >
                <div>
                  <span className="text-sm font-medium opacity-90">
                    {item.date}
                  </span>
                  <h3 className="font-bold text-sm mt-1 line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="text-xs opacity-90 mt-1 line-clamp-1">
                    {item.description}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-2 mt-3 flex-nowrap min-w-0">
                  <div className="flex items-center gap-1 min-w-0 shrink">
                    {item.tags.length > 0 && (
                      <Chip
                        size="sm"
                        variant="flat"
                        className="bg-white/25 text-white border-0 text-xs h-6"
                      >
                        {item.tags[0]}
                      </Chip>
                    )}
                    {item.tags.length > 1 && (
                      <Tooltip
                        content={
                          <div className="px-1 py-1">
                            <p className="text-xs font-semibold mb-1">Bộ phận:</p>
                            <ul className="text-xs space-y-0.5">
                              {item.tags.slice(1).map((tag) => (
                                <li key={tag}>{tag}</li>
                              ))}
                            </ul>
                          </div>
                        }
                      >
                        <Chip
                          size="sm"
                          variant="flat"
                          className="bg-white/25 text-white border-0 text-xs h-6 cursor-help"
                        >
                          +{item.tags.length - 1}
                        </Chip>
                      </Tooltip>
                    )}
                  </div>
                  {item.hasFile && (
                    <span className="inline-flex items-center gap-0.5 text-xs opacity-90 shrink-0 whitespace-nowrap">
                      <Paperclip size={12} />
                      Có file
                    </span>
                  )}
                </div>
              </CardBody>
            </Card>
            </div>
          ))}
        </div>
      </div>

      <BulletinDetailModal
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        bulletin={selectedBulletin}
      />

      {isAdmin && editBulletin && (
        <EditBulletinModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setEditBulletin(null);
          }}
          bulletin={editBulletin}
          onSuccess={() => {
            setEditModalOpen(false);
            setEditBulletin(null);
          }}
        />
      )}
    </section>
  );
}
