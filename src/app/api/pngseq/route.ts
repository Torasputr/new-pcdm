import crypto from "crypto";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

const PNGSEQ_DIR = path.join(process.cwd(), "public/pngseq");

export async function GET() {
  try {
    const entries = fs.readdirSync(PNGSEQ_DIR, { withFileTypes: true });
    const sortedNames = entries
      .filter(
        (entry) =>
          entry.isFile() && /\.(png|webp|jpg|jpeg)$/i.test(entry.name),
      )
      .map((entry) => entry.name)
      .sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
      );

    // Deduplicate identical frame files by content hash so the browser
    // only downloads & decodes unique frames while preserving the exact 87-frame timeline.
    const hashToUrl = new Map<string, string>();
    const frames = sortedNames.map((name) => {
      const fullPath = path.join(PNGSEQ_DIR, name);
      const buffer = fs.readFileSync(fullPath);
      const hash = crypto.createHash("sha1").update(buffer).digest("hex");

      let canonicalUrl = hashToUrl.get(hash);
      if (!canonicalUrl) {
        canonicalUrl = `/pngseq/${encodeURIComponent(name)}`;
        hashToUrl.set(hash, canonicalUrl);
      }
      return canonicalUrl;
    });

    return Response.json({
      frames,
      totalFrames: frames.length,
      uniqueFrames: hashToUrl.size,
    });
  } catch (error) {
    console.error("Failed to list PNG sequence frames:", error);
    return Response.json({ frames: [] }, { status: 500 });
  }
}
