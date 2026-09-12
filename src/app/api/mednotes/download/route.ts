import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { Readable } from "stream";

export const runtime = "nodejs";

export async function GET() {
  const appDir = path.join(process.cwd(), "mednotes");
  if (!fs.existsSync(path.join(appDir, "package.json"))) {
    return NextResponse.json({ error: "MedNotes app not found" }, { status: 404 });
  }

  const child = spawn(
    "tar",
    ["-czf", "-", "--exclude=node_modules", "--exclude=.DS_Store", "."],
    { cwd: appDir }
  );

  const webStream = Readable.toWeb(child.stdout) as ReadableStream;

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "Content-Type": "application/gzip",
      "Content-Disposition": 'attachment; filename="MedNotes-mac.tar.gz"',
    },
  });
}
