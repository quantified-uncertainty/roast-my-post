import fs from "fs";
import path from "path";

export function writeLogFile(
  logDir: string,
  filename: string,
  content: string
): void {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const logPath = path.join(logDir, filename);
  fs.writeFileSync(logPath, content);
}

export function readFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf-8");
}

export function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}
