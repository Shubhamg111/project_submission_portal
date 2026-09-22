/**
 * Bridge between the React frontend and the Google Apps Script Web App.
 *
 * The frontend never talks to Google Drive directly and never sees any
 * Drive credentials — it only knows the Apps Script Web App URL, configured
 * via VITE_GOOGLE_APPS_SCRIPT_URL (see .env.example).
 */

import { sanitizeForFilename } from '../utils/filename.js';

const ENDPOINT = "https://script.google.com/macros/s/AKfycbws9-F9tDLXOIG5zHvF_qOQ8QT4NDHE-36vZet02Fne_Ud7Or-t-j6tP6qT-AhbKS_FFQ/exec";

/** Error whose `userMessage` is always safe to show directly to a student. */
export class SubmissionError extends Error {
  constructor(userMessage, cause) {
    super(userMessage);
    this.name = 'SubmissionError';
    this.userMessage = userMessage;
    this.cause = cause;
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Apps Script Web Apps deliver their response through an internal
 * redirect. Plain GET requests handle that redirect cleanly everywhere;
 * a POST's JSON response occasionally does not reach the browser even
 * though the server already finished writing the file. When that
 * happens, this checks — over GET, which doesn't have that problem —
 * whether the file actually landed before we tell the student it failed.
 */
async function verifyRecentUpload({ section, studentName, studentId }) {
  const namePrefix = `${sanitizeForFilename(studentName)}_${sanitizeForFilename(studentId)}`;
  const url =
    `${ENDPOINT}?mode=verify&section=${encodeURIComponent(section)}` +
    `&namePrefix=${encodeURIComponent(namePrefix)}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url);
      const result = await response.json();
      if (result && result.status === 'success') return result;
    } catch (err) {
      // ignore and retry — the file listing may just need a moment
    }
    if (attempt < 2) await wait(1500);
  }
  return null;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.split(',')[1] ?? '';
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('file-read-failed'));
    reader.readAsDataURL(file);
  });
}

/**
 * Submit a project to the section's Google Drive folder.
 * @param {{studentName:string, studentId:string, section:string, projectTitle:string, file:File}} data
 * @returns {Promise<{status:string, fileName:string, section:string}>}
 */
export async function submitProject({ studentName, studentId, section, projectTitle, projectType, file }) {
  if (!ENDPOINT) {
    throw new SubmissionError(
      'The submission portal is not configured yet. Please contact your instructor.'
    );
  }

  let fileData;
  try {
    fileData = await fileToBase64(file);
  } catch (err) {
    throw new SubmissionError(
      'Could not read the selected file. Please try choosing it again.',
      err
    );
  }

  const payload = {
    studentName: studentName.trim(),
    studentId: studentId.trim(),
    section,
    projectTitle: projectTitle.trim(),
    projectType,
    fileName: file.name,
    mimeType: file.type || 'application/zip',
    fileData,
  };

  let result = null;
  let postFailed = false;

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      // Deliberately text/plain, not application/json: Apps Script Web Apps
      // don't handle CORS preflight (OPTIONS) requests. Using a "simple
      // request" content type avoids the preflight; the body is still a
      // JSON string underneath, and Code.gs parses it with JSON.parse.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    result = await response.json();
    if (!response.ok || !result || (result.status !== 'success' && result.status !== 'duplicate')) {
      postFailed = true;
    }
  } catch (err) {
    // This is the common case when the upload actually succeeded: Apps
    // Script delivers its response through an internal redirect that a
    // POST doesn't always survive, even though doPost already finished.
    postFailed = true;
  }

  if (result && result.status === 'duplicate') {
    throw new SubmissionError(
      result.message || 'You have already submitted a project with this name and ID.',
      result
    );
  }

  if (postFailed) {
    const verified = await verifyRecentUpload({
      section: payload.section,
      studentName: payload.studentName,
      studentId: payload.studentId,
    });
    if (verified) return verified;

    throw new SubmissionError(
      'Project submission failed. Please try again. If the problem continues, contact your instructor.',
      result
    );
  }

  return result;
}
