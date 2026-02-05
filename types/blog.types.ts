/**
 * Blog-related types – dùng cho blog list, detail.
 */

export type TBlog = {
  id: string;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  updatedAt?: string;
};
