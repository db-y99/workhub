import { NextRequest, NextResponse } from "next/server";
import { env } from "@/config/env";

type OcrScriptBody = {
  fileBase64: string;
  fileName: string;
  folderId?: string;
};

type OcrScriptResponse = {
  success: boolean;
  text?: string;
  message?: string;
};

/**
 * Proxy gọi Google Apps Script OCR.
 * Body: { fileBase64, fileName, folderId? }
 * Script trả về: { success, text?, message? }
 */
export async function POST(request: NextRequest) {
  const scriptUrl = env.VISION_OCR_SCRIPT_URL;
  if (!scriptUrl) {
    return NextResponse.json(
      { success: false, message: "VISION_OCR_SCRIPT_URL chưa được cấu hình." },
      { status: 503 }
    );
  }

  let body: OcrScriptBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Body phải là JSON hợp lệ." },
      { status: 400 }
    );
  }

  const { fileBase64, fileName } = body;
  if (!fileBase64 || typeof fileBase64 !== "string" || !fileName || typeof fileName !== "string") {
    return NextResponse.json(
      { success: false, message: "Thiếu fileBase64 hoặc fileName." },
      { status: 400 }
    );
  }

  const folderId = body.folderId ?? env.VISION_OCR_FOLDER_ID ?? "";

  try {
    const res = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileBase64,
        fileName,
        folderId,
      }),
    });

    const data = (await res.json()) as OcrScriptResponse;
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi khi gọi OCR.";
    return NextResponse.json(
      { success: false, message },
      { status: 502 }
    );
  }
}
