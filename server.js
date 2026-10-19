
const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const PAPERS_FILE = path.join(DATA_DIR, "papers.json");
const RESULTS_FILE = path.join(DATA_DIR, "results.json");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

fs.mkdirSync(DATA_DIR, { recursive: true });
for (const file of [PAPERS_FILE, RESULTS_FILE]) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, "[]", "utf8");
}

app.use(express.json({ limit: "150kb" }));
app.use(express.static(path.join(__dirname, "Public")));

const COURSE = [
  {
    code: "M1-R5",
    name: "IT Tools and Network Basics",
    chapters: [
      "Introduction to Computer", "Operating System", "Word Processing",
      "Spreadsheet", "Presentation", "Internet and WWW",
      "Email, Social Networking and e-Governance", "Digital Financial Tools",
      "FutureSkills and Cyber Security", "Computer Networks"
    ]
  },
  {
    code: "M2-R5",
    name: "Web Designing and Publishing",
    chapters: [
      "Introduction to Web Design", "HTML Basics", "HTML Forms and Multimedia",
      "CSS Basics", "CSS Layout and Responsive Design", "JavaScript Basics",
      "Web Publishing and Hosting"
    ]
  },
  {
    code: "M3-R5",
    name: "Programming and Problem Solving through Python",
    chapters: [
      "Algorithms and Flowcharts", "Python Introduction", "Variables and Data Types",
      "Operators and Expressions", "Conditional Statements", "Loops",
      "Strings and Lists", "Tuples, Sets and Dictionaries", "Functions",
      "Modules and Packages", "File Handling", "Exceptions"
    ]
  },
  {
    code: "M4-R5",
    name: "Internet of Things and its Applications",
    chapters: [
      "Introduction to IoT", "IoT Architecture", "Sensors and Actuators",
      "IoT Devices and Connectivity", "IoT Applications", "Security and Privacy in IoT"
    ]
  }
];

const QUESTION_BANK = {
  "Introduction to Computer": [
    { question: "Computer ka main kaam kya hai?", options: ["Data ko process karna", "Sirf print karna", "Sirf music chalana", "Sirf internet chalana"], answer: 0, explanation: "Computer data ko process karke output deta hai." },
    { question: "CPU ka full form kya hai?", options: ["Central Processing Unit", "Computer Personal Unit", "Central Program Utility", "Control Power Unit"], answer: 0, explanation: "CPU ka full form Central Processing Unit hai." },
    { question: "Inmein se input device kaunsa hai?", options: ["Monitor", "Printer", "Keyboard", "Speaker"], answer: 2, explanation: "Keyboard se data enter kiya jata hai." },
    { question: "Temporary computer memory kaunsi hai?", options: ["RAM", "DVD", "Printer", "Paper"], answer: 0, explanation: "RAM temporary memory hai." },
    { question: "Output device kaunsa hai?", options: ["Mouse", "Keyboard", "Scanner", "Monitor"], answer: 3, explanation: "Monitor output screen par dikhata hai." },
    { question: "Binary number system mein kaun se digits hote hain?", options: ["0 aur 1", "1 aur 2", "0 se 9", "A se F"], answer: 0, explanation: "Binary mein 0 aur 1 hote hain." },
    { question: "Hardware ka example kya hai?", options: ["Operating system", "MS Word", "Mouse", "Web browser"], answer: 2, explanation: "Mouse ek physical device hai." },
    { question: "Raw facts ko kya kehte hain?", options: ["Information", "Data", "Output", "Program"], answer: 1, explanation: "Raw facts data kehlate hain." },
    { question: "1 byte mein kitne bits hote hain?", options: ["2", "4", "8", "16"], answer: 2, explanation: "1 byte = 8 bits." },
    { question: "Computer start hone ki process kya hai?", options: ["Booting", "Browsing", "Scanning", "Printing"], answer: 0, explanation: "Computer start hone ki process booting hai." }
  ],
  "HTML Basics": [
    { question: "HTML ka full form kya hai?", options: ["HyperText Markup Language", "HighText Machine Language", "Hyper Transfer Main Link", "Home Tool Markup Language"], answer: 0, explanation: "HTML ka full form HyperText Markup Language hai." },
    { question: "HTML document ka root element kaunsa hai?", options: ["head", "body", "html", "title"], answer: 2, explanation: "html document ka root element hai." },
    { question: "Visible webpage content aam taur par kis tag mein hota hai?", options: ["body", "meta", "head", "style"], answer: 0, explanation: "Visible content body element mein hota hai." },
    { question: "Sabse high-level heading tag kaunsa hai?", options: ["h6", "head", "h1", "heading"], answer: 2, explanation: "h1 sabse high-level heading hai." },
    { question: "Hyperlink banane ke liye kaunsa tag hai?", options: ["linkto", "a", "href", "url"], answer: 1, explanation: "Anchor tag a hyperlink banata hai." },
    { question: "Image add karne ke liye kaunsa tag hai?", options: ["picturefile", "img", "image", "src"], answer: 1, explanation: "img tag image dikhata hai." },
    { question: "Paragraph tag kaunsa hai?", options: ["para", "p", "pg", "text"], answer: 1, explanation: "p paragraph element hai." },
    { question: "Anchor tag ka link attribute kaunsa hai?", options: ["href", "DOCTYPE", "browser", "website"], answer: 0, explanation: "href link ka destination batata hai." },
    { question: "HTML comment ka format kya hai?", options: ["// comment", "/* comment */", "<!-- comment -->", "# comment"], answer: 2, explanation: "HTML comment <!-- aur --> ke beech hota hai." },
    { question: "Browser tab ka title kis tag se set hota hai?", options: ["caption", "title", "h1", "header"], answer: 1, explanation: "title tag document ka title set karta hai." }
  ]
};

function readJson(file) {
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

function admin(req, res, next) {
  if (!ADMIN_PASSWORD) {
    return res.status(503).json({
      error: "Render Environment Variables mein ADMIN_PASSWORD set nahi hai."
    });
  }
  if ((req.get("x-admin-password") || "") !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Admin password galat hai." });
  }
  next();
}

function safePaper(p) {
  return {
    id: p.id,
    title: p.title,
    subject: p.subject,
    chapters: p.chapters,
    total: p.questions.length,
    durationMinutes: p.durationMinutes,
    createdAt: p.createdAt
  };
}

app.get("/api/health", (req, res) =>
  res.json({ ok: true, aiConfigured: false })
);

app.get("/api/course", (req, res) =>
  res.json({ modules: COURSE })
);

app.post("/api/admin/generate-paper", admin, (req, res) => {
  const moduleCode = String(req.body?.moduleCode || "");
  const mod = COURSE.find(m => m.code === moduleCode);
  const chapters = Array.isArray(req.body?.chapters)
    ? req.body.chapters.map(String)
    : [];
  const count = Math.max(5, Math.min(50, Number(req.body?.count) || 20));
  const level = ["Basic", "Normal", "Hard"].includes(req.body?.level)
    ? req.body.level
    : "Normal";
  const durationMinutes = Math.max(
    5, Math.min(180, Number(req.body?.durationMinutes) || 30)
  );
  const title = String(req.body?.title || "").trim().slice(0, 100);

  if (!mod) {
    return res.status(400).json({ error: "O Level module select karo." });
  }
  if (!chapters.length || chapters.some(c => !mod.chapters.includes(c))) {
    return res.status(400).json({
      error: "Isi module ke valid chapters select karo."
    });
  }
  if (count < chapters.length) {
    return res.status(400).json({
      error: "Questions ki sankhya selected chapters se kam nahi ho sakti."
    });
  }

  const available = chapters.flatMap(chapter =>
    (QUESTION_BANK[chapter] || []).map(q => ({ ...q, chapter }))
  );

  if (available.length < count) {
    return res.status(400).json({
      error: `In chapters ke liye ${available.length} offline questions available hain. ${count} questions ke liye sirf Introduction to Computer ya HTML Basics select karo aur count 5 se 10 rakho.`
    });
  }

  for (let i = available.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [available[i], available[j]] = [available[j], available[i]];
  }

  const questions = available.slice(0, count).map((q, i) => ({
    id: i + 1,
    question: q.question,
    options: q.options,
    answer: q.answer,
    explanation: q.explanation,
    chapter: q.chapter
  }));

  const paper = {
    id: crypto.randomUUID(),
    title: title || `${mod.code} — ${level} Practice Test`,
    subject: `${mod.code}: ${mod.name}`,
    moduleCode: mod.code,
    chapters,
    level,
    durationMinutes,
    questions,
    createdAt: new Date().toISOString()
  };

  const papers = readJson(PAPERS_FILE);
  papers.push(paper);
  writeJson(PAPERS_FILE, papers);
  res.json({ paper: safePaper(paper) });
});

app.get("/api/admin/papers", admin, (req, res) => {
  res.json({ papers: readJson(PAPERS_FILE).map(safePaper).reverse() });
});

app.get("/api/test/:id", (req, res) => {
  const paper = readJson(PAPERS_FILE).find(p => p.id === req.params.id);
  if (!paper) {
    return res.status(404).json({
      error: "Test nahi mila. QR code ya link check karo."
    });
  }

  res.json({
    paper: {
      id: paper.id,
      title: paper.title,
      subject: paper.subject,
      chapters: paper.chapters,
      total: paper.questions.length,
      durationMinutes: paper.durationMinutes
    },
    questions: paper.questions.map(({ answer, explanation, ...q }) => q)
  });
});

app.post("/api/test/:id/submit", (req, res) => {
  const paper = readJson(PAPERS_FILE).find(p => p.id === req.params.id);
  if (!paper) return res.status(404).json({ error: "Test nahi mila." });

  const name = String(req.body?.name || "").trim().slice(0, 80);
  const roll = String(req.body?.roll || "").trim().slice(0, 40);
  const answers = req.body?.answers;

  if (!name || !roll) {
    return res.status(400).json({ error: "Naam aur roll number zaroori hain." });
  }
  if (!Array.isArray(answers) || answers.length !== paper.questions.length) {
    return res.status(400).json({ error: "Answers incomplete hain." });
  }

  let score = 0;
  const review = paper.questions.map((q, i) => {
    const selected = Number(answers[i]);
    const isCorrect = Number.isInteger(selected) && selected === q.answer;
    if (isCorrect) score++;
    return {
      question: q.question,
      chapter: q.chapter,
      selected: Number.isInteger(selected) ? selected : -1,
      correctAnswer: q.answer,
      isCorrect,
      explanation: q.explanation
    };
  });

  const result = {
    id: crypto.randomUUID(),
    paperId: paper.id,
    paperTitle: paper.title,
    name,
    roll,
    score,
    total: paper.questions.length,
    percentage: Math.round(score / paper.questions.length * 100),
    review,
    createdAt: new Date().toISOString()
  };

  const results = readJson(RESULTS_FILE);
  results.push(result);
  writeJson(RESULTS_FILE, results);

  res.json({
    result: {
      paperTitle: result.paperTitle,
      score,
      total: result.total,
      percentage: result.percentage,
      review
    }
  });
});

app.get("/api/admin/results", admin, (req, res) => {
  const papers = readJson(PAPERS_FILE);
  const results = readJson(RESULTS_FILE).map(r => ({
    id: r.id,
    paperTitle: r.paperTitle,
    name: r.name,
    roll: r.roll,
    score: r.score,
    total: r.total,
    percentage: r.percentage,
    createdAt: r.createdAt
  })).reverse();

  res.json({ results, paperCount: papers.length });
});

app.post("/api/admin/analyze", admin, (req, res) => {
  const results = readJson(RESULTS_FILE);
  if (!results.length) {
    return res.json({
      analysis: "Abhi student results nahi hain. Pehle students se test submit karwao."
    });
  }

  const stats = {};
  for (const result of results) {
    for (const item of (result.review || [])) {
      if (!item.chapter) continue;
      if (!stats[item.chapter]) stats[item.chapter] = { correct: 0, total: 0 };
      stats[item.chapter].total++;
      if (item.isCorrect) stats[item.chapter].correct++;
    }
  }

  const average = Math.round(
    results.reduce((sum, r) => sum + (Number(r.percentage) || 0), 0) /
    results.length
  );
  const chapters = Object.entries(stats)
    .map(([chapter, s]) => ({
      chapter,
      accuracy: Math.round(s.correct / s.total * 100),
      total: s.total
    }))
    .sort((a, b) => a.accuracy - b.accuracy);

  let analysis = `Total tests: ${results.length}\nAverage score: ${average}%.\n`;
  if (chapters.length) {
    analysis += "\nRevision ke liye chapters:\n";
    analysis += chapters.slice(0, 5)
      .map(c => `- ${c.chapter}: ${c.accuracy}% correct (${c.total} questions)`)
      .join("\n");
    analysis += "\n\nSujhav: kam accuracy wale chapters revise karke dobara test dein.";
  }

  res.json({ analysis });
});

app.get(/.*/, (req, res) =>
  res.sendFile(path.join(__dirname, "Public", "index.html"))
);

app.listen(PORT, "0.0.0.0", () =>
  console.log(`O Level practice test running on port ${PORT}`)
);
      
