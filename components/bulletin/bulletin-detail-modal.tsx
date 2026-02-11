"use client";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Paperclip, ExternalLink } from "lucide-react";
import type { TBulletinItem } from "@/types/bulletin.types";
import { Link } from "@heroui/link";

interface BulletinDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  bulletin: TBulletinItem | null;
}

export function BulletinDetailModal({
  isOpen,
  onClose,
  bulletin,
}: BulletinDetailModalProps) {
  if (!bulletin) return null;

  const attachments = bulletin.attachments ?? [];

  return (
    <Modal
      isOpen={isOpen}
      scrollBehavior="inside"
      size="3xl"
      onClose={onClose}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <div
                className={`rounded-t-lg -mx-6 -mt-6 px-6 pt-6 pb-4 bg-gradient-to-br ${bulletin.gradient || "from-primary to-primary-600"} text-white`}
              >
                <span className="text-sm font-medium opacity-90">
                  {bulletin.date}
                </span>
                <h2 className="text-xl font-bold mt-1">{bulletin.title}</h2>
                <div className="mt-2">
                  <p className="text-xs opacity-80 mb-1">Bộ phận liên quan:</p>
                  <div className="flex flex-wrap gap-1">
                    {bulletin.tags.map((tag) => (
                      <Chip
                        key={tag}
                        size="sm"
                        variant="flat"
                        className="bg-white/25 text-white border-0"
                      >
                        {tag}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>
            </ModalHeader>
            <ModalBody className="max-h-[70vh] overflow-y-auto">
              <div className="flex flex-col gap-4">
                {bulletin.description && (
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-default-500 mb-2">
                      Nội dung
                    </p>
                    <div className="text-default-700 whitespace-pre-wrap break-words overflow-visible">
                      {bulletin.description}
                    </div>
                  </div>
                )}

                {attachments.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-default-500 mb-2 flex items-center gap-1">
                      <Paperclip size={14} />
                      File đính kèm
                    </p>
                    <ul className="flex flex-col gap-2">
                      {attachments.map((att, i) => (
                        <Link isExternal key={i} href={`/api/bulletin-files?fileId=${att.fileId}&bulletinId=${bulletin.id}`}>
                          <ExternalLink size={14} />
                          {att.name}
                          {att.size != null && (
                            <span className="text-default-400 text-xs">
                              ({(att.size / 1024).toFixed(1)} KB)
                            </span>
                          )}
                        </Link>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose}>
                Đóng
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
