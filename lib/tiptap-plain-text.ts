import { generateJSON } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";

/** Cùng extensions với TiptapRichEditor để parse đúng schema */
const extensions = [
  StarterKit.configure({ heading: false }),
  Placeholder.configure({ placeholder: "" }),
  TextAlign.configure({ types: ["heading", "paragraph"] }),
];

type JSONContent = { type?: string; content?: JSONContent[]; text?: string }

/** Block node types: xuống dòng sau mỗi block */
const BLOCK_TYPES = new Set(["doc", "paragraph", "blockquote", "listItem", "bulletList", "orderedList", "codeBlock", "heading"]);

function extractTextFromNode(node: JSONContent): string {
  if (node.text != null) return node.text;
  const content = node.content;
  if (!content?.length) return "";
  const isBlock = node.type && BLOCK_TYPES.has(node.type);
  const sep = isBlock ? "\n" : "";
  return content.map(extractTextFromNode).filter(Boolean).join(sep);
}

/**
 * Parse HTML (Tiptap output) → plain text. Chạy được trên server (dùng @tiptap/html).
 * Fallback: trả về chuỗi rỗng nếu parse lỗi.
 */
export function tiptapHtmlToPlainText(html: string): string {
  try {
    const doc = generateJSON(html, extensions) as JSONContent;
    const text = extractTextFromNode(doc);
    return text.replace(/\n{3,}/g, "\n\n").trim();
  } catch {
    return "";
  }
}
