# Student Project Submission Portal

A frontend-only portal that lets students upload a ZIP of their project,
which is automatically filed into the correct section folder on the
college's Google Drive — no traditional backend, database, or server
required. Google Apps Script acts as the bridge between the React frontend
and Google Drive.

```
React Frontend  →  Google Apps Script Web App  →  Google Drive
```

## Project structure

```
src/
├── components/
│   ├── Header.jsx           masthead / title / instructions
│   ├── SubmissionForm.jsx   the form itself (state, validation, submit)
│   ├── FileUpload.jsx       ZIP drop zone + selected-file chip
│   ├── LoadingState.jsx     small spinner used in the submit button
│   └── SuccessMessage.jsx   confirmation screen after a successful upload
├── services/
│   └── googleDrive.js       talks to the Apps Script Web App
├── utils/
│   ├── validation.js        SECTIONS, MAX_FILE_SIZE_MB, field validators
│   └── filename.js          "StudentName_StudentID.zip" generation
├── App.jsx
├── main.jsx
└── index.css

apps-script/
└── Code.gs                  Google Apps Script backend (paste into Apps Script editor)
```

---

## 1. Prerequisites

- Node.js 18+ and npm
- A Google account with access to the college/instructor's Google Drive
  (this is the account the Apps Script will run as)

---

## 2. Set up Google Drive + Apps Script

### 2.1 Create the Apps Script project

1. Go to [script.google.com](https://script.google.com) and click **New project**.
2. Delete the default `Code.gs` contents and paste in the full contents of
   `apps-script/Code.gs` from this repo.
3. Rename the project (top left) to something like **Project Submission Portal API**.

### 2.2 Create the folder structure

You don't have to create the folders by hand — the script does it for you:

1. In the Apps Script editor, use the function dropdown (top toolbar) to
   select **setupFolders**, then click **Run**.
2. The first time you run any function, Google will ask you to authorize
   the script's access to your Drive — accept it (it needs Drive access to
   create folders and files).
3. Check your Google Drive: you should now see a
   **Student Project Submissions** folder containing all 12 section
   subfolders (`F251` … `F2512`).

This is idempotent — running it again won't create duplicates.

### 2.3 Deploy as a Web App

1. Click **Deploy > New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Configure:
   - **Execute as:** `Me` (your account — this is what keeps the Drive
     folder private; students never authenticate with Google at all)
   - **Who has access:** `Anyone`
4. Click **Deploy**, authorize again if prompted, and copy the **Web app
   URL** it gives you (it looks like
   `https://script.google.com/macros/s/XXXXXXXX/exec`).

That URL is the only thing the frontend needs — it is not a secret in the
sense of a private key, but you should still avoid publishing it somewhere
unrelated to the portal, since anyone with it can submit projects.

> **Important:** whenever you edit `Code.gs` after this, changes are **not**
> live until you deploy again. Use **Deploy > Manage deployments > Edit
> (pencil icon) > New version > Deploy** so the URL stays the same.

---

## 3. Configure and run the frontend

### 3.1 Install dependencies

```bash
npm install
```

### 3.2 Set the Apps Script URL

Copy the example env file and paste in the URL from step 2.3:

```bash
cp .env.example .env
```

```
VITE_GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/XXXXXXXX/exec
```

Never commit your real `.env` file — `.gitignore` already excludes it.

### 3.3 Run locally

```bash
npm run dev
```

Open the printed local URL, fill out the form with a small test ZIP, and
confirm the file lands in the right section folder in Drive.

### 3.4 Build for production

```bash
npm run build
```

This outputs a static `dist/` folder that you can host anywhere that
serves static files (e.g. Netlify, Vercel, GitHub Pages, or the college's
own web server) — remember to set `VITE_GOOGLE_APPS_SCRIPT_URL` as an
environment variable in whatever platform builds it, since it's baked in
at build time.

---

## 4. Configuration knobs

| Setting | Where | Default | Notes |
|---|---|---|---|
| `SECTIONS` / `ALLOWED_SECTIONS` | `src/utils/validation.js` **and** `apps-script/Code.gs` | 12 fixed sections | Keep both lists identical. The frontend list only drives the dropdown; the Apps Script list is what's actually enforced. |
| `MAX_FILE_SIZE_MB` | `src/utils/validation.js` **and** `Code.gs` | `40` | Google Apps Script caps a single Drive blob at 50MB, and the base64-encoded upload is ~33% larger than the raw file — 40MB keeps every upload safely under both limits. Raise it only if you understand that ceiling. |
| `DUPLICATE_STRATEGY` | `apps-script/Code.gs` | `'suffix'` | `'suffix'` keeps every submission and appends `_2`, `_3`, ... to repeats. `'reject'` refuses a second submission with the same generated filename instead. |
| `ENABLE_LOG` | `apps-script/Code.gs` | `true` | When on, every submission also appends a row (timestamp, name, ID, section, project title, filename) to a **Submissions Log** spreadsheet inside the root Drive folder, so the instructor has a quick index without opening every subfolder. |

---

## 5. Security notes

- The frontend only ever knows the Apps Script Web App URL — no Drive
  credentials, service-account keys, or OAuth secrets exist in the React
  code or bundle.
- The Apps Script always runs as your Google account ("Execute as: Me"),
  so students never need Drive access or a Google login of their own —
  the folder stays private to the college/instructor.
- The section a file is saved into is **re-validated on the server**
  (`ALLOWED_SECTIONS` in `Code.gs`) — a modified or malicious frontend
  request can't write into an arbitrary Drive folder.

---

## 6. Troubleshooting

- **"Project submission failed" on every attempt:** open the Apps Script
  project, go to **Executions** (left sidebar) to see the actual server
  error — this detail is intentionally hidden from students in the UI.
- **CORS / network error in the browser console:** double-check the
  deployment's access is set to **Anyone** (not "Anyone with Google
  account" or "Only myself"), and that you're using the `/exec` URL, not
  `/dev`.
- **Changes to `Code.gs` don't seem to apply:** you need to push a new
  deployment version (see the note at the end of section 2.3) — editing
  the script alone doesn't update a live deployment.
- **Upload fails only for large files:** see the `MAX_FILE_SIZE_MB` note
  in the configuration table above; Apps Script's 50MB blob limit is a
  hard ceiling.
# project_submission_portal
