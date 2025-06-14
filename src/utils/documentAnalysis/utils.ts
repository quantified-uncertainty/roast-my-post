import {
  mkdir,
  writeFile,
} from "fs/promises";
import path from "path";

export async function writeLogFile(content: string, filename: string) {
  const logsDir = path.join(process.cwd(), "logs");
  try {
    await mkdir(logsDir, { recursive: true });
    await writeFile(path.join(logsDir, filename), content, "utf-8");
    console.log(`📝 Log written to ${filename}`);
  } catch (err) {
    console.error("❌ Error writing log file:", err);
  }
}
