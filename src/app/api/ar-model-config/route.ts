import {
  DEFAULT_AR_MODEL_TRANSFORM,
  mergeArModelTransform,
  type ArModelTransform,
} from "@/lib/ar-model-config";
import { head, put } from "@vercel/blob";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

const CONFIG_PATH = path.join(process.cwd(), "public/config/ar-model.json");
const BLOB_PATHNAME = "config/ar-model.json";

function readConfigFile(): ArModelTransform {
  const raw = fs.readFileSync(CONFIG_PATH, "utf8");
  return mergeArModelTransform(JSON.parse(raw) as Partial<ArModelTransform>);
}

function writeConfigFile(transform: ArModelTransform): void {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(
    CONFIG_PATH,
    `${JSON.stringify(transform, null, 2)}\n`,
    "utf8",
  );
}

async function readConfigBlob(): Promise<ArModelTransform | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;

  try {
    const meta = await head(BLOB_PATHNAME);
    const response = await fetch(meta.url, { cache: "no-store" });
    if (!response.ok) return null;
    return mergeArModelTransform(
      (await response.json()) as Partial<ArModelTransform>,
    );
  } catch {
    return null;
  }
}

async function writeConfigBlob(transform: ArModelTransform): Promise<void> {
  await put(BLOB_PATHNAME, JSON.stringify(transform, null, 2), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
  });
}

async function readConfig(): Promise<ArModelTransform> {
  const fromBlob = await readConfigBlob();
  if (fromBlob) return fromBlob;

  try {
    return readConfigFile();
  } catch {
    return DEFAULT_AR_MODEL_TRANSFORM;
  }
}

async function writeConfig(transform: ArModelTransform): Promise<void> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await writeConfigBlob(transform);
    return;
  }

  writeConfigFile(transform);
}

export async function GET() {
  try {
    const config = await readConfig();
    return Response.json(config);
  } catch (error) {
    console.error("Failed to read ar-model config:", error);
    return Response.json(DEFAULT_AR_MODEL_TRANSFORM);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ArModelTransform>;
    const config = mergeArModelTransform(body);
    await writeConfig(config);
    return Response.json({ ok: true, config });
  } catch (error) {
    console.error("Failed to save ar-model config:", error);
    return Response.json(
      { ok: false, error: "Could not save config." },
      { status: 500 },
    );
  }
}
