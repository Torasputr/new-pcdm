import {
  DEFAULT_AR_MODEL_TRANSFORM,
  mergeArModelTransform,
  type ArModelTransform,
} from "@/lib/ar-model-config";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

const CONFIG_PATH = path.join(process.cwd(), "public/config/ar-model.json");

function readConfigFile(): ArModelTransform {
  const raw = fs.readFileSync(CONFIG_PATH, "utf8");
  return mergeArModelTransform(JSON.parse(raw) as Partial<ArModelTransform>);
}

function writeConfigFile(transform: ArModelTransform): void {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, `${JSON.stringify(transform, null, 2)}\n`, "utf8");
}

export async function GET() {
  try {
    const config = readConfigFile();
    return Response.json(config);
  } catch (error) {
    console.error("Failed to read ar-model.json:", error);
    return Response.json(DEFAULT_AR_MODEL_TRANSFORM);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ArModelTransform>;
    const config = mergeArModelTransform(body);
    writeConfigFile(config);
    return Response.json({ ok: true, config });
  } catch (error) {
    console.error("Failed to save ar-model.json:", error);
    return Response.json(
      { ok: false, error: "Could not save config file." },
      { status: 500 },
    );
  }
}
