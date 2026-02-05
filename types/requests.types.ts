export type TRequestComment = {
  id: string;
  request_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?:
    | { full_name: string; email: string; avatar_url?: string }
    | { full_name: string; email: string; avatar_url?: string }[];
};