import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const mediaId = searchParams.get("id");
    const token = process.env.WHATSAPP_API_TOKEN;

    if (!mediaId || !token) {
      return new NextResponse("Missing media ID or token", { status: 400 });
    }

    // 1. Get media URL from Meta Graph API
    const metaRes = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!metaRes.ok) {
      return new NextResponse("Failed to fetch media metadata from Meta", { status: metaRes.status });
    }

    const metaData = await metaRes.json();
    const targetUrl = metaData.url;
    const mimeType = metaData.mime_type || "image/jpeg";

    if (!targetUrl) {
      return new NextResponse("No URL returned from Meta", { status: 404 });
    }

    // 2. Fetch raw media bytes with bearer token
    const fileRes = await fetch(targetUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!fileRes.ok) {
      return new NextResponse("Failed to fetch media binary from Meta", { status: fileRes.status });
    }

    const arrayBuffer = await fileRes.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
      },
    });
  } catch (err: any) {
    console.error("Error proxying Meta media:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
