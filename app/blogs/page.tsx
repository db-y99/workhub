import { Suspense } from "react";
import BlogList from "@/components/blog-list.client";

export default async function BlogsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Blogs</h1>
      <Suspense fallback={<div className="text-default-500">Đang tải...</div>}>
        <BlogList initialSearch={params.search ?? ""} />
      </Suspense>
    </div>
  );
}
