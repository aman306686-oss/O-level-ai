O LEVEL AI QUESTION PAPER + QR TEST WEBSITE
===========================================

Included:
- Mobile-friendly student test UI
- Admin-only difficulty setting: Basic / Normal / Hard
- NIELIT O Level starter module and chapter list
- Admin selects module, exact chapters, total questions, time and paper title
- AI generates MCQ paper from selected chapter scope
- Each paper is saved on the server
- Unique test link + QR code for students
- Students answer MCQs and submit
- Server-side scoring; correct answers are not sent to student before submission
- Results dashboard and AI class analysis

IMPORTANT LIMITS:
- This is a starter project, not a fully audited production exam system.
- The built-in module/chapter names are a starter list. Check the current official NIELIT syllabus and add/edit chapter lists before relying on full syllabus coverage.
- AI-generated questions can contain mistakes. Review papers before giving them to students.
- "Normal" asks AI for exam-style/common concepts, but does NOT guarantee actual frequently asked questions. For verified frequency, upload/use trustworthy previous-year papers and review them.
- QR code is generated from the deployed site's URL. It will not work for other students if the site is only running on your phone/local computer.
- This starter uses JSON files for persistence. Configure a persistent disk or replace JSON storage with a managed database; ephemeral hosting may lose papers/results after restart/redeploy.
- Students' names and roll numbers are personal data. Collect only what you need, restrict access, and provide a privacy notice.
- API key must be server-side only, never in public HTML.
- Admin password protection is a basic shared-password gate. Before real public/high-stakes use, add proper accounts, rate limits, audit logs, stronger session security, backups, privacy controls and a security review.

DEPLOY FROM AN ANDROID PHONE:
1. Extract ZIP on your phone.
2. Create a private GitHub repository and upload package.json, server.js, public/index.html, .gitignore and README-HINDI.txt. Do not upload API keys or live data.
3. Sign in to https://render.com and create a Web Service linked to the repo.
4. Build command: npm install
   Start command: npm start
5. Add server Environment Variables:
   OPENAI_API_KEY = your secret OpenAI API key
   OPENAI_MODEL = gpt-5-mini (only if available to your API account)
   ADMIN_PASSWORD = choose a long unique password
   DATA_DIR = /var/data (only if you also attach a persistent disk mounted at /var/data)
6. If using Render persistent disk, attach one and mount it at /var/data. Without persistent storage or a database, saved papers/results may be lost on restart.
7. Deploy, open the resulting https://... URL, tap Admin and enter the admin password.
8. Select module, tick exact chapters, make chapter count match selected checkbox count, choose question count, difficulty and duration, then tap Generate.
9. QR appears. Students scan it using phone camera and open the URL.

API billing and availability:
- OpenAI API use may cost money and API billing is separate from a ChatGPT subscription.
- Check official API account/billing information at https://platform.openai.com/
- Render docs: https://render.com/docs/web-services
- Render environment variables: https://render.com/docs/configure-environment-variables

LOCAL RUN (requires Node.js terminal):
npm install
npm start
Then open http://localhost:3000
