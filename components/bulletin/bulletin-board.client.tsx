"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Megaphone, Plus, Paperclip, Edit, ChevronRight } from "lucide-react";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Tooltip } from "@heroui/tooltip";
import { Button } from "@heroui/button";
import { BulletinDetailModal } from "./bulletin-detail-modal";
import { EditBulletinModal } from "./edit-bulletin-modal";
import { useAuth } from "@/lib/contexts/auth-context";
import { fetcher } from "@/lib/fetcher";
import { BULLETIN_GRADIENTS } from "@/constants/bulletins";
import { ROUTES } from "@/constants/routes";
import type { TBulletinItem, TBulletinsResponse } from "@/types/bulletin.types";
import { PERMISSION_ACTIONS, toPermissionCode } from "@/constants/permissions";

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
  const { isAdmin, hasPermission } = useAuth();
  const router = useRouter();
  
  // Permission checks
  const canEdit = hasPermission(toPermissionCode("bulletins", PERMISSION_ACTIONS.EDIT));

  // Fetch 12 items đầu cho carousel
  const { data: carouselData } = useSWR<TBulletinsResponse>(
    itemsProp ? null : "/api/bulletins?page=1&limit=12",
    fetcher
  );

  const displayedItems = itemsProp?.slice(0, 12) ?? carouselData?.bulletins ?? [];
  const totalItems = itemsProp?.length ?? carouselData?.pagination?.total ?? 0;
  const hasMoreItems = itemsProp 
    ? itemsProp.length > 12 
    : (carouselData?.pagination?.hasMore ?? false);
  
  const handleViewAll = () => {
    router.push(ROUTES.BULLETINS);
  };

  // Carousel drag functionality
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  const handleBulletinClick = (item: TBulletinItem) => {
    // Chỉ mở modal nếu không phải drag
    if (!hasDragged) {
      setSelectedBulletin(item);
      setDetailOpen(true);
    }
    // Reset drag state sau khi click
    setHasDragged(false);
  };

  const handleEditClick = (item: TBulletinItem) => {
    setEditBulletin(item);
    setEditModalOpen(true);
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollContainerRef.current) return;
    // Chỉ bắt đầu drag nếu click vào vùng trống hoặc card (không phải button)
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="button"]')) {
      return;
    }

    setIsDragging(true);
    setHasDragged(false);
    startXRef.current = e.pageX - scrollContainerRef.current.offsetLeft;
    scrollLeftRef.current = scrollContainerRef.current.scrollLeft;
    scrollContainerRef.current.style.cursor = "grabbing";
    scrollContainerRef.current.style.userSelect = "none";
    scrollContainerRef.current.style.scrollBehavior = "auto"; // Tắt smooth khi drag
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setHasDragged(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = "grab";
      scrollContainerRef.current.style.userSelect = "auto";
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = "grab";
      scrollContainerRef.current.style.userSelect = "auto";
      scrollContainerRef.current.style.scrollBehavior = "smooth"; // Bật lại smooth sau khi drag
    }
    // Reset drag state sau một khoảng thời gian ngắn
    setTimeout(() => {
      setHasDragged(false);
    }, 100);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !scrollContainerRef.current) return;
    
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 2; // Scroll speed multiplier
    
    // Nếu di chuyển > 5px thì coi là drag
    if (Math.abs(walk) > 5) {
      setHasDragged(true);
      e.preventDefault();
      scrollContainerRef.current.scrollLeft = scrollLeftRef.current - walk;
    }
  };

  // Set initial cursor style
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = "grab";
    }
  }, []);

  return (
    <section className="mb-6 w-full max-w-full">
      {showTitle && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Megaphone className="text-default-500" size={24} />
            Bảng tin công ty
          </h2>
          <Button
            size="sm"
            variant="flat"
            color="primary"
            endContent={<ChevronRight size={16} />}
            onPress={handleViewAll}
          >
            Xem tất cả
          </Button>
        </div>
      )}
      <div
        ref={scrollContainerRef}
        className="bulletin-scroll-x w-full pb-3"
        style={{ 
          overscrollBehaviorX: "contain",
          scrollBehavior: "smooth"
        }}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onWheel={(e) => {
          // Horizontal scroll với wheel (smooth)
          if (scrollContainerRef.current && !isDragging) {
            e.preventDefault();
            scrollContainerRef.current.scrollBy({
              left: e.deltaY,
              behavior: "smooth"
            });
          }
        }}
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

          {displayedItems.map((item) => (
            <div
              key={item.id}
              className="w-[260px] min-w-[260px] h-[180px] shrink-0 relative cursor-pointer select-none"
              onClick={() => handleBulletinClick(item)}
            >
              <Card className="w-full h-full overflow-hidden">
                {canEdit && (
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

          {/* Button "Xem tất cả" */}
          {hasMoreItems && (
            <Card
              isPressable
              onPress={handleViewAll}
              className="w-[260px] min-w-[260px] h-[180px] shrink-0 border-2 border-dashed border-primary bg-primary/5 hover:border-primary-500 hover:bg-primary/10 transition-colors"
            >
              <CardBody className="flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <ChevronRight className="text-primary" size={24} />
                  </div>
                  <div className="text-center">
                    <span className="text-primary font-semibold block">Xem tất cả</span>
                    <span className="text-xs text-default-500 mt-1">
                      {totalItems - 12} tin khác
                    </span>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      <BulletinDetailModal
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        bulletin={selectedBulletin}
      />

      {canEdit && editBulletin && (
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
