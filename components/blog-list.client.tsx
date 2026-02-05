"use client";

import { useState, useEffect, useMemo } from "react";
import { useDebounceValue } from "usehooks-ts";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Search } from "lucide-react";
import type { TBlog } from "@/types/blog.types";
import { ROUTES } from "@/constants/routes";

// Mock data – thay thế bằng API/service thực tế sau
const MOCK_BLOGS: TBlog[] = [
  {
    id: "1",
    title: "Giới thiệu về hệ thống phê duyệt",
    content:
      "Hệ thống phê duyệt giúp quản lý các yêu cầu một cách hiệu quả...",
    author: "Admin",
    createdAt: "2024-01-15",
  },
  {
    id: "2",
    title: "Hướng dẫn sử dụng tính năng mới",
    content:
      "Tính năng mới cho phép người dùng tạo yêu cầu nhanh chóng...",
    author: "Admin",
    createdAt: "2024-01-20",
  },
  {
    id: "3",
    title: "Cập nhật bảo mật hệ thống",
    content: "Hệ thống đã được cập nhật với các biện pháp bảo mật mới...",
    author: "Admin",
    createdAt: "2024-02-01",
  },
];

type TBlogListProps = {
  initialSearch?: string;
};

function formatBlogDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export default function BlogList({ initialSearch = "" }: TBlogListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(initialSearch);
  const [debouncedSearchValue] = useDebounceValue(searchValue, 300);
  const [blogs, setBlogs] = useState<TBlog[]>(MOCK_BLOGS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearchValue) {
      params.set("search", debouncedSearchValue);
    } else {
      params.delete("search");
    }
    router.replace(`${ROUTES.BLOGS}?${params.toString()}`, { scroll: false });
  }, [debouncedSearchValue, router, searchParams]);

  const filteredBlogs = useMemo(() => {
    if (!debouncedSearchValue) return blogs;
    const searchLower = debouncedSearchValue.toLowerCase();
    return blogs.filter(
      (blog) =>
        blog.title.toLowerCase().includes(searchLower) ||
        blog.content.toLowerCase().includes(searchLower) ||
        blog.author.toLowerCase().includes(searchLower)
    );
  }, [blogs, debouncedSearchValue]);

  return (
    <div className="w-full">
      <Card>
        <CardHeader className="flex gap-3">
          <div className="flex flex-col flex-1">
            <div className="mb-5 mt-2 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Danh sách Blog</h2>
            </div>
            <p className="text-small text-default-500">
              Tổng số: {filteredBlogs.length} bài viết
            </p>
          </div>
        </CardHeader>
        <CardBody>
          <div className="mb-6">
            <Input
              className="max-w-[400px]"
              classNames={{
                inputWrapper: "bg-default-100",
              }}
              placeholder="Tìm kiếm blog..."
              startContent={<Search className="text-default-400" size={18} />}
              value={searchValue}
              onValueChange={setSearchValue}
            />
          </div>

          {loading ? (
            <div className="text-center py-8 text-default-500">
              Đang tải...
            </div>
          ) : filteredBlogs.length === 0 ? (
            <div className="text-center py-8 text-default-500">
              Không tìm thấy blog nào
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBlogs.map((blog) => (
                <Card
                  key={blog.id}
                  className="hover:bg-default-50 transition-colors"
                >
                  <CardBody>
                    <div className="flex flex-col gap-2">
                      <h3 className="text-lg font-semibold">{blog.title}</h3>
                      <p className="text-sm text-default-600 line-clamp-2">
                        {blog.content}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-default-500 mt-2">
                        <span>Tác giả: {blog.author}</span>
                        <span>Ngày tạo: {formatBlogDate(blog.createdAt)}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="light"
                        color="primary"
                        className="self-start mt-2"
                      >
                        Đọc thêm
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
