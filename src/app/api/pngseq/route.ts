import fs from "fs";
import path from "path";

export const runtime = "nodejs";

const PNGSEQ_DIR = path.join(process.cwd(), "public/pngseq");

export async function GET() {
  try {
    const entries = fs.readdirSync(PNGSEQ_DIR, { withFileTypes: true });
    const frames = entries
      .filter(
        (entry) =>
          entry.isFile() && /\.(png|webp|jpg|jpeg)$/i.test(entry.name),
      )
      .map((entry) => entry.name)
      .sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
      )
      .map((name) => `/pngseq/${encodeURIComponent(name)}`);

    return Response.json({ frames });
  } catch (error) {
    console.error("Failed to list PNG sequence frames:", error);
    return Response.json({ frames: [] }, { status: 500 });
  }
}
