-- Bảng lưu tin nhắn thảo luận theo từng request
CREATE TABLE request_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_request_comments_request_id ON request_comments(request_id);
CREATE INDEX idx_request_comments_created_at ON request_comments(created_at);

-- Bật Realtime cho bảng request_comments (chat thảo luận)
ALTER PUBLICATION supabase_realtime ADD TABLE request_comments;
