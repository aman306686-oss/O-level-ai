const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const PAPERS_FILE = path.join(DATA_DIR, "papers.json");
const RESULTS_FILE = path.join(DATA_DIR, "results.json");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";

fs.mkdirSync(DATA_DIR, { recursive: true });
for (const f of [PAPERS_FILE, RESULTS_FILE]) {
  if (!fs.existsSync(f)) fs.writeFileSync(f, "[]", "utf8");
}
app.use(express.json({ limit: "150kb" }));
app.use(express.static(path.join(__dirname, "Public")));

const COURSE = [
  {
    code: "M1-R5", name: "IT Tools and Network Basics",
    chapters: [
      "Introduction to Computer", "Operating System", "Word Processing",
      "Spreadsheet", "Presentation", "Internet and WWW", "Email, Social Networking and e-Governance",
      "Digital Financial Tools", "FutureSkills and Cyber Security", "Computer Networks"
    ]
  },
  {
    code: "M2-R5", name: "Web Designing and Publishing",
    chapters: [
      "Introduction to Web Design", "HTML Basics", "HTML Forms and Multimedia",
      "CSS Basics", "CSS Layout and Responsive Design", "JavaScript Basics",
      "Web Publishing and Hosting"
    ]
  },
  {
    code: "M3-R5", name: "Programming and Problem Solving through Python",
    chapters: [
      "Algorithms and Flowcharts", "Python Introduction", "Variables and Data Types",
      "Operators and Expressions", "Conditional Statements", "Loops",
      "Strings and Lists", "Tuples, Sets and Dictionaries", "Functions",
      "Modules and Packages", "File Handling", "Exceptions"
    ]
  },
  {
    code: "M4-R5", name: "Internet of Things and its Applications",
    chapters: [
      "Introduction to IoT", "IoT Architecture", "Sensors and Actuators",
      "IoT Devices and Connectivity", "IoT Applications", "Security and Privacy in IoT"
    ]
  }
];

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return []; }
}
function writeJson(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8"); }
function admin(req, res, next) {
  if (!ADMIN_PASSWORD) return res.status(503).json({ error: "Server par ADMIN_PASSWORD environment variable set nahi hai." });
  if ((req.get("x-admin-password") || "") !== ADMIN_PASSWORD) return res.status(401).json({ error: "Admin password galat hai." });
  next();
}
function aiClient() {
  if (!process.env.OPENAI_API_KEY) throw new Error("AI API key set nahi hai. Hosting ke Environment Variables mein OPENAI_API_KEY add karo.");
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}
async function askAI(instructions, input, maxOutputTokens = 5000) {
  const client = aiClient();
  const response = await client.responses.create({
    model: MODEL, instructions, input, max_output_tokens: maxOutputTokens
  });
  return response.output_text || "";
}
function safePaper(p) {
  return { id: p.id, title: p.title, subject: p.subject, chapters: p.chapters, total: p.questions.length, durationMinutes: p.durationMinutes, createdAt: p.createdAt };
}

app.get("/api/health", (req, res) => res.json({ ok: true, aiConfigured: !!process.env.OPENAI_API_KEY }));
app.get("/api/course", (req, res) => res.json({ modules: COURSE }));

app.post("/api/admin/generate-paper", admin, async (req, res) => {
  const moduleCode = String(req.body?.moduleCode || "");
  const mod = COURSE.find(m => m.code === moduleCode);
  const chapters = Array.isArray(req.body?.chapters) ? req.body.chapters.map(String) : [];
  const count = Math.max(5, Math.min(50, Number(req.body?.count) || 20));
  const level = ["Basic", "Normal", "Hard"].includes(req.body?.level) ? req.body.level : "Normal";
  const durationMinutes = Math.max(5, Math.min(180, Number(req.body?.durationMinutes) || 30));
  const title = String(req.body?.title || "").trim().slice(0, 100);
  if (!mod) return res.status(400).json({ error: "O Level module select karo." });
  if (!chapters.length || chapters.some(c => !mod.chapters.includes(c))) return res.status(400).json({ error: "Isi module ke ek ya zyada valid chapters select karo." });
  if (count < chapters.length) return res.status(400).json({ error: "Total questions, selected chapters ki sankhya se kam nahi ho sakte." });

  const levelInstructions = {
    Basic: "Basic level: direct concept checks, definitions, simple understanding and easy application.",
    Normal: "Normal level: exam-style important concepts, commonly tested patterns, moderate application. Do not claim a question is frequently asked unless supported by supplied evidence.",
    Hard: "Hard level: challenging, indirect, scenario-based and concept-application MCQs. Questions may be tricky but must remain fair and strictly inside the selected official syllabus topics."
  }[level];

  try {
    const raw = await askAI(
      `You create original NIELIT O Level practice MCQs. Use ONLY the supplied module and selected chapter names as the scope. Do not invent facts or claim these are official, leaked, or actual previous-year questions. ${levelInstructions}
Return ONLY valid JSON, no markdown, in this shape:
{"title":"...","questions":[{"question":"...","options":["A","B","C","D"],"answer":0,"explanation":"short explanation","chapter":"exact selected chapter name"}]}
Rules: exactly ${count} questions; each has exactly 4 options; answer is integer 0-3; one unambiguously correct answer; language simple Hindi/Hinglish with standard technical terms; balance questions across selected chapters as evenly as possible; each chapter value must be one of the supplied selected chapter names; no duplicates.`,
      JSON.stringify({ module: mod.name, moduleCode: mod.code, selectedChapters: chapters, difficulty: level, requestedQuestionCount: count, language: "Hindi/Hinglish" }),
      7500
    );
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed.questions) || parsed.questions.length !== count) throw new Error("AI ne requested count ke hisaab se valid questions nahi banaye. Dobara try karo.");
    const questions = parsed.questions.map((q, i) => {
      if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || !Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) {
        throw new Error(`Question ${i + 1} ka format invalid hai.`);
      }
      const chapter = chapters.includes(q.chapter) ? q.chapter : chapters[i % chapters.length];
      return { id: i + 1, question: String(q.question), options: q.options.map(String), answer: q.answer, explanation: String(q.explanation || ""), chapter };
    });
    const paper = {
      id: crypto.randomUUID(), title: title || String(parsed.title || `${mod.code} — ${level} Test`),
      subject: `${mod.code}: ${mod.name}`, moduleCode: mod.code, chapters, level,
      durationMinutes, questions, createdAt: new Date().toISOString()
    };
    const papers = readJson(PAPERS_FILE); papers.push(paper); writeJson(PAPERS_FILE, papers);
    res.json({ paper: safePaper(paper) });
  } catch (e) {
    res.status(502).json({ error: "AI paper generate nahi ho paya. API key, billing aur model access check karo. Detail: " + (e.message || "unknown error") });
  }
});

app.get("/api/admin/papers", admin, (req, res) => {
  res.json({ papers: readJson(PAPERS_FILE).map(safePaper).reverse() });
});

app.get("/api/test/:id", (req, res) => {
  const paper = readJson(PAPERS_FILE).find(p => p.id === req.params.id);
  if (!paper) return res.status(404).json({ error: "Test nahi mila. QR code ya link check karo." });
  res.json({
    paper: { id: paper.id, title: paper.title, subject: paper.subject, chapters: paper.chapters, total: paper.questions.length, durationMinutes: paper.durationMinutes },
    questions: paper.questions.map(({ answer, explanation, ...q }) => q)
  });
});

app.post("/api/test/:id/submit", (req, res) => {
  const paper = readJson(PAPERS_FILE).find(p => p.id === req.params.id);
  if (!paper) return res.status(404).json({ error: "Test nahi mila." });
  const name = String(req.body?.name || "").trim().slice(0, 80);
  const roll = String(req.body?.roll || "").trim().slice(0, 40);
  const answers = req.body?.answers;
  if (!name || !roll) return res.status(400).json({ error: "Naam aur roll number zaroori hain." });
  if (!Array.isArray(answers) || answers.length !== paper.questions.length) return res.status(400).json({ error: "Answers incomplete hain." });

  let score = 0;
  const review = paper.questions.map((q, i) => {
    const selected = Number(answers[i]);
    const isCorrect = Number.isInteger(selected) && selected === q.answer;
    if (isCorrect) score++;
    return { question: q.question, chapter: q.chapter, selected: Number.isInteger(selected) ? selected : -1, correctAnswer: q.answer, isCorrect, explanation: q.explanation };
  });
  const result = {
    id: crypto.randomUUID(), paperId: paper.id, paperTitle: paper.title, name, roll,
    score, total: paper.questions.length, percentage: Math.round(score / paper.questions.length * 100),
    review, createdAt: new Date().toISOString()
  };
  const results = readJson(RESULTS_FILE); results.push(result); writeJson(RESULTS_FILE, results);
  res.json({ result: { paperTitle: result.paperTitle, score, total: result.total, percentage: result.percentage, review } });
});

app.get("/api/admin/results", admin, (req, res) => {
  const papers = readJson(PAPERS_FILE);
  const results = readJson(RESULTS_FILE).map(r => ({
    id: r.id, paperTitle: r.paperTitle, name: r.name, roll: r.roll,
    score: r.score, total: r.total, percentage: r.percentage, createdAt: r.createdAt
  })).reverse();
  res.json({ results, paperCount: papers.length });
});

app.post("/api/admin/analyze", admin, async (req, res) => {
  const results = readJson(RESULTS_FILE);
  if (!results.length) return res.json({ analysis: "Abhi student results nahi hain. Pehle students se test submit karwao." });
  const compact = results.slice(-100).map(r => ({
    paperTitle: r.paperTitle, score: `${r.score}/${r.total}`, percentage: r.percentage,
    answers: r.review.map(a => ({ chapter: a.chapter, correct: a.isCorrect }))
  }));
  try {
    const analysis = await askAI(
      "You are a careful education analytics helper. Analyze the provided test results. Summarize common strengths, chapters that may need revision, and actionable study suggestions. Be encouraging and do not shame or rank individual students. Do not infer sensitive traits. Answer in simple Hindi/Hinglish.",
      JSON.stringify(compact), 1200
    );
    res.json({ analysis });
  } catch (e) { res.status(503).json({ error: e.message || "AI analysis available nahi hai." }); }
});

app.get(/.*/, (req, res) => res.sendFile(path.join(__dirname, "Public", "index.html")));
app.listen(PORT, "0.0.0.0", () => console.log(`O Level AI QR Test running on port ${PORT}`));
