import fs from "node:fs";
import path from "node:path";

const BANK_ROOT = path.join(process.cwd(), "public", "bank");
const MODEL = process.env.TOPIC_ENCODER_MODEL || "qwen2.5:14b";
const OLLAMA_URL = "http://127.0.0.1:11434/api/generate";
const SHOULD_WRITE = process.argv.includes("--write");
const FORCE = process.argv.includes("--force");
const LIMIT = readNumberArg("--limit", SHOULD_WRITE ? Infinity : 5);

function readNumberArg(name, fallback) {
  const argument = process.argv.find((value) => value.startsWith(name + "="));
  if (!argument) return fallback;

  const number = Number(argument.slice(name.length + 1));
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function findQuestionFiles(directory) {
  const files = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === ".DS_Store") continue;

    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...findQuestionFiles(fullPath));
      continue;
    }

    const isQuestion =
      entry.name.endsWith(".json") &&
      entry.name !== "chapters.json" &&
      entry.name !== "status.json";

    if (isQuestion) files.push(fullPath);
  }

  return files.sort();
}

function getLocation(filePath) {
  const parts = path.relative(BANK_ROOT, filePath).split(path.sep);
  return {
    exam: parts[0],
    subject: parts[1],
    chapter: parts[3],
  };
}

function plainText(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatEncodedTopic(chapter, topic) {
  const repeatedPrefix = new RegExp(`^${escapeRegExp(chapter)}\\s*-\\s*`, "i");
  const exactTopic = topic.replace(repeatedPrefix, "").trim();
  return `${chapter} - ${exactTopic}`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function saveQuestion(file, json) {
  const temporaryFile = file + ".encoding";
  fs.writeFileSync(temporaryFile, JSON.stringify(json) + "\n");
  fs.renameSync(temporaryFile, file);
}

function getOptions(data) {
  if (!Array.isArray(data.options)) return "";

  return data.options
    .map((option) => {
      const marker = option.isCorrect ? " [CORRECT]" : "";
      return plainText(option.text || option.image || option.id) + marker;
    })
    .filter(Boolean)
    .join(" | ");
}

function buildPrompt(location, data) {
  return [
    "Identify the single most specific academic topic tested by this question.",
    'Return JSON only in this exact shape: {"topic":"short topic name"}.',
    "Use the exact recognized syllabus name, not a broad category or a sentence.",
    "If the question tests a named reaction, law, theorem, process, disease, structure, or formula, return that exact name.",
    "Use the correct answer and solution to disambiguate image-based questions.",
    "Do not include the chapter name because it will be added separately.",
    "",
    `Exam: ${location.exam}`,
    `Subject: ${location.subject}`,
    `Chapter: ${location.chapter}`,
    `Question: ${plainText(data.question?.text || data.question?.image)}`,
    `Options: ${getOptions(data)}`,
    `Solution: ${plainText(data.solution?.text || data.solution?.image)}`,
    `Existing topics: ${JSON.stringify(data.topics || [])}`,
    `Existing concepts: ${JSON.stringify(data.concepts || [])}`,
    `Existing micro-concepts: ${JSON.stringify(data.microConcepts || [])}`,
  ].join("\n");
}

async function askLocalModel(prompt) {
  const response = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      stream: false,
      format: "json",
      options: { temperature: 0 },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama request failed with status ${response.status}`);
  }

  const result = await response.json();
  const parsed = JSON.parse(result.response);
  const topic = plainText(parsed.topic);

  if (!topic) throw new Error("The local model returned an empty topic");
  return topic;
}

async function encodeWithRetries(prompt) {
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await askLocalModel(prompt);
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt} failed: ${error.message}`);
    }
  }

  throw lastError;
}

async function main() {
  const files = findQuestionFiles(BANK_ROOT);
  let encoded = 0;
  let failed = 0;

  for (const file of files) {
    if (encoded >= LIMIT) break;

    const json = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!json.success || !json.data) continue;
    if (json.data.encodedTopic && !FORCE) continue;

    const location = getLocation(file);

    try {
      const exactTopic = await encodeWithRetries(buildPrompt(location, json.data));
      const encodedTopic = formatEncodedTopic(location.chapter, exactTopic);

      console.log(JSON.stringify({ file, encodedTopic }));

      if (SHOULD_WRITE) {
        json.data.encodedTopic = encodedTopic;
        delete json.data.topic;
        saveQuestion(file, json);
      }

      encoded += 1;
    } catch (error) {
      failed += 1;
      console.error(JSON.stringify({ file, error: error.message }));
    }
  }

  console.log(
    JSON.stringify({
      mode: SHOULD_WRITE ? "write" : "dry-run",
      model: MODEL,
      encoded,
      failed,
      totalFiles: files.length,
    }),
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
