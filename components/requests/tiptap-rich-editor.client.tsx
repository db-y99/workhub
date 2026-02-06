"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link,
  Highlighter,
  Palette,
} from "lucide-react";
import { Button } from "@heroui/button";

interface TiptapRichEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
}

export function TiptapRichEditor({
  value = "",
  onChange,
  placeholder = "Nhập nội dung chi tiết...",
  minHeight = "120px",
  className = "",
}: TiptapRichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value,
    editable: true,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[100px] px-3 py-2",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const currentHtml = editor.getHTML();
    const isCurrentEmpty =
      !currentHtml ||
      currentHtml === "<p></p>" ||
      currentHtml === "<p><br></p>";
    const isValueEmpty =
      !value || value === "<p></p>" || value === "<p><br></p>";
    if (isCurrentEmpty && isValueEmpty) return;
    if (value !== currentHtml) {
      editor.commands.setContent(value || "<p></p>", { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div
      className={`rounded-lg border border-default-200 bg-default-50 overflow-hidden ${className}`}
    >
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-default-200 bg-default-100">
        <select
          className="text-xs rounded px-2 py-1 border border-default-200 bg-background"
          defaultValue="10px"
        >
          {["10px", "12px", "14px", "16px", "18px", "24px"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          variant={editor.isActive("bold") ? "solid" : "flat"}
          isIconOnly
          onPress={() => editor.chain().focus().toggleBold().run()}
          className="min-w-8 w-8 h-8"
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant={editor.isActive("italic") ? "solid" : "flat"}
          isIconOnly
          onPress={() => editor.chain().focus().toggleItalic().run()}
          className="min-w-8 w-8 h-8"
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="flat"
          isIconOnly
          className="min-w-8 w-8 h-8"
          title="Underline"
        >
          <span className="font-bold underline text-sm">U</span>
        </Button>
        <Button
          size="sm"
          variant={editor.isActive("strike") ? "solid" : "flat"}
          isIconOnly
          onPress={() => editor.chain().focus().toggleStrike().run()}
          className="min-w-8 w-8 h-8"
        >
          <Strikethrough className="w-4 h-4" />
        </Button>
        <span className="w-px h-6 bg-default-300 mx-1" />
        <Button size="sm" variant="flat" isIconOnly className="min-w-8 w-8 h-8">
          <Palette className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="flat" isIconOnly className="min-w-8 w-8 h-8">
          <Highlighter className="w-4 h-4" />
        </Button>
        <span className="w-px h-6 bg-default-300 mx-1" />
        <Button
          size="sm"
          variant={editor.isActive("bulletList") ? "solid" : "flat"}
          isIconOnly
          onPress={() => editor.chain().focus().toggleBulletList().run()}
          className="min-w-8 w-8 h-8"
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant={editor.isActive("orderedList") ? "solid" : "flat"}
          isIconOnly
          onPress={() => editor.chain().focus().toggleOrderedList().run()}
          className="min-w-8 w-8 h-8"
        >
          <ListOrdered className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant={editor.isActive({ textAlign: "left" }) ? "solid" : "flat"}
          isIconOnly
          onPress={() => editor.chain().focus().setTextAlign("left").run()}
          className="min-w-8 w-8 h-8"
        >
          <AlignLeft className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant={editor.isActive({ textAlign: "center" }) ? "solid" : "flat"}
          isIconOnly
          onPress={() => editor.chain().focus().setTextAlign("center").run()}
          className="min-w-8 w-8 h-8"
        >
          <AlignCenter className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant={editor.isActive({ textAlign: "right" }) ? "solid" : "flat"}
          isIconOnly
          onPress={() => editor.chain().focus().setTextAlign("right").run()}
          className="min-w-8 w-8 h-8"
        >
          <AlignRight className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="flat" isIconOnly className="min-w-8 w-8 h-8">
          <Link className="w-4 h-4" />
        </Button>
      </div>
      <div style={{ minHeight }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
