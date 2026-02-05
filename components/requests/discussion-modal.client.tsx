"use client";

import { useState, useEffect, useRef } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Avatar } from "@heroui/avatar";
import { MessageCircle, Send } from "lucide-react";
import {
  getRequestComments,
  addRequestComment,
} from "@/lib/actions/requests";
import type { TRequestComment } from "@/types/requests.types";
import { formatDate } from "@/lib/functions";
import { useAuth } from "@/lib/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";

interface DiscussionModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: { id: string; title?: string } | null;
  onUpdate?: () => void;
}

export function DiscussionModal({
  isOpen,
  onClose,
  request,
  onUpdate,
}: DiscussionModalProps) {
  const { currentUser } = useAuth();
  const [comments, setComments] = useState<TRequestComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !request?.id) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      const { data, error: err } = await getRequestComments(request.id);
      setLoading(false);
      if (err) {
        setError(err);
        return;
      }
      setComments(data ?? []);
    };

    load();
  }, [isOpen, request?.id]);

  useEffect(() => {
    if (!isOpen || !request?.id) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`request_comments:${request.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "request_comments",
          filter: `request_id=eq.${request.id}`,
        },
        async () => {
          const { data } = await getRequestComments(request.id);
          setComments(data ?? []);
          onUpdate?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, request?.id, onUpdate]);

  useEffect(() => {
    if (comments.length && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || !request?.id || sending) return;

    setSending(true);
    setError(null);
    const { data, error: err } = await addRequestComment(request.id, trimmed);
    setSending(false);

    if (err) {
      setError(err);
      return;
    }

    if (data) {
      setComments((prev) => [...prev, data]);
      setInputValue("");
      onUpdate?.();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const displayName = (c: TRequestComment) => {
    const p = Array.isArray(c.profile)
      ? c.profile[0]
      : (c.profile as { full_name?: string; email?: string } | undefined);
    return p?.full_name || p?.email || "User";
  };

  const isOwn = (c: TRequestComment) => c.user_id === currentUser?.id;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      scrollBehavior="inside"
      classNames={{
        base: "max-h-[90vh]",
        header: "border-b border-default-200",
        body: "p-0 overflow-hidden flex flex-col",
        footer: "border-t border-default-200",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-row items-center justify-between gap-2 py-4">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">
                  Thảo luận
                  {request?.title && (
                    <span className="text-default-500 font-normal ml-2">
                      — {request.title}
                    </span>
                  )}
                </h2>
              </div>

            </ModalHeader>
            <ModalBody className="gap-0">
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto overflow-x-hidden px-4"
                style={{ minHeight: "280px", maxHeight: "400px" }}
              >
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-default-500">Đang tải tin nhắn...</p>
                  </div>
                ) : error ? (
                  <div className="py-8 text-center text-danger">{error}</div>
                ) : comments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-default-500">
                    <MessageCircle className="w-12 h-12 mb-2 opacity-50" />
                    <p>Chưa có tin nhắn nào. Hãy bắt đầu thảo luận!</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 py-2">
                    {comments.map((c) => (
                      <div
                        key={c.id}
                        className={`flex gap-3 ${isOwn(c) ? "flex-row-reverse" : ""
                          }`}
                      >
                        <Avatar
                          name={displayName(c)}
                          size="sm"
                          className="flex-shrink-0"
                        />
                        <div
                          className={`flex flex-col max-w-[75%] ${isOwn(c) ? "items-end" : "items-start"
                            }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">
                              {displayName(c)}
                            </span>
                            <span className="text-xs text-default-400">
                              {formatDate(c.created_at)}
                            </span>
                          </div>
                          <div
                            className={`rounded-lg px-3 py-2 text-sm ${isOwn(c)
                              ? "bg-primary text-primary-foreground"
                              : "bg-default-100"
                              }`}
                          >
                            {c.content}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-default-200">
                <div className="flex gap-2">
                  <Input
                    placeholder="Nhập tin nhắn..."
                    value={inputValue}
                    onValueChange={setInputValue}
                    onKeyDown={handleKeyDown}
                    isDisabled={sending || loading}
                    classNames={{ inputWrapper: "flex-1" }}
                  />
                  <Button
                    color="primary"
                    isIconOnly
                    onPress={handleSend}
                    isLoading={sending}
                    isDisabled={!inputValue.trim() || loading}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
