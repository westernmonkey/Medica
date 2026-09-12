import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

export const runtime = "nodejs";

export async function POST() {
  const appDir = path.join(process.cwd(), "mednotes");
  if (!fs.existsSync(path.join(appDir, "package.json"))) {
    return NextResponse.json({ error: "MedNotes app not found" }, { status: 404 });
  }

  const child = spawn("npm", ["start"], {
    cwd: appDir,
    detached: true,
    stdio: "ignore",
    env: process.env,
  });
  child.unref();

  return NextResponse.json({ ok: true });
}
