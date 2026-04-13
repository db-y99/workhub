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

  console.log("[OCR] fileName:", fileName);
  console.log("[OCR] fileBase64 length:", fileBase64.length);
  console.log("[OCR] folderId:", folderId || "(trống)");
  console.log("[OCR] scriptUrl:", scriptUrl);
  console.log("[OCR] Bắt đầu gọi Apps Script...");
  const t0 = Date.now();

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

    console.log("[OCR] Apps Script response status:", res.status, res.statusText, `(${Date.now() - t0}ms)`);

    const rawText = await res.text();
    console.log("[OCR] Raw response (first 500 chars):", rawText.slice(0, 500));

    let data: OcrScriptResponse;
    try {
      data = JSON.parse(rawText) as OcrScriptResponse;
    } catch {
      console.error("[OCR] Không parse được JSON từ Apps Script:", rawText.slice(0, 300));
      return NextResponse.json(
        { success: false, message: "Apps Script trả về response không hợp lệ." },
        { status: 502 }
      );
    }

    console.log("[OCR] Kết quả:", { success: data.success, textLength: data.text?.length, message: data.message });

    if (data.success && !data.text) {
      console.warn("[OCR] Apps Script trả success=true nhưng thiếu field 'text'. Response:", data);
      return NextResponse.json({
        success: false,
        message: "Apps Script không trả về nội dung OCR. Kiểm tra lại script.",
      });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[OCR] Lỗi khi gọi Apps Script:", err);
    const message = err instanceof Error ? err.message : "Lỗi khi gọi OCR.";
    return NextResponse.json(
      { success: false, message },
      { status: 502 }
    );
  }
}
