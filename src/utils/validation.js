/**
 * Shared configuration + validation for the submission form.
 *
 * IMPORTANT: this list must stay in sync with the ALLOWED_SECTIONS list in
 * apps-script/Code.gs. The frontend list only drives the dropdown and a
 * friendly early error message — the Apps Script is what actually enforces
 * it, since the browser can never be trusted to supply the real folder name.
 */
export const SECTIONS = [
  'F251', 'F252', 'F253', 'F254', 'F255', 'F256',
  'F257', 'F258', 'F259', 'F2510', 'F2511', 'F2512',
];

/**
 * Technology/category of the project. Purely informational — it does not
 * affect where the file is stored, only what's shown and logged. Edit this
 * list freely; nothing else needs to change to add or remove an option.
 */
export const PROJECT_TYPES = [
  'React',
  'Java',
  'Other',
];

/**
 * Maximum ZIP size the portal will accept.
 *
 * Google Apps Script's DriveApp caps a single blob at 50MB, and because the
 * file has to travel to Apps Script as a base64 string (there is no real
 * backend to stream a multipart upload through), the encoded payload is
 * ~33% larger than the raw file on top of that. 40MB keeps every upload
 * safely under both limits. Raise this only if you understand that ceiling.
 */
export const MAX_FILE_SIZE_MB = 40;

export function isBlank(value) {
  return !value || String(value).trim().length === 0;
}

export function validateStudentName(value) {
  if (isBlank(value)) return 'Please enter your name.';
  return null;
}

export function validateStudentId(value) {
  if (isBlank(value)) return 'Please enter your student ID.';
  return null;
}

export function validateSection(value) {
  if (isBlank(value)) return 'Please select your section.';
  if (!SECTIONS.includes(value)) return 'Please select a valid section.';
  return null;
}

export function validateProjectTitle(value) {
  if (isBlank(value)) return 'Please enter your project title.';
  return null;
}

export function validateProjectType(value) {
  if (isBlank(value)) return 'Please select your project type.';
  if (!PROJECT_TYPES.includes(value)) return 'Please select a valid project type.';
  return null;
}

export function validateFile(file) {
  if (!file) return 'Please select your project ZIP file.';

  const name = file.name || '';
  const isZipExtension = name.toLowerCase().endsWith('.zip');
  const isZipMime = file.type === 'application/zip' || file.type === 'application/x-zip-compressed' || file.type === '';
  if (!isZipExtension || !isZipMime) {
    return 'Only ZIP files are allowed.';
  }

  const maxBytes = MAX_FILE_SIZE_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    return `File is too large. Maximum allowed size is ${MAX_FILE_SIZE_MB}MB.`;
  }

  if (file.size === 0) {
    return 'The selected file appears to be empty. Please choose a valid ZIP file.';
  }

  return null;
}

/**
 * Validate the whole form at once.
 * Returns { isValid, errors } where errors is keyed by field name.
 */
export function validateForm({ studentName, studentId, section, projectTitle, projectType, file }) {
  const errors = {
    studentName: validateStudentName(studentName),
    studentId: validateStudentId(studentId),
    section: validateSection(section),
    projectTitle: validateProjectTitle(projectTitle),
    projectType: validateProjectType(projectType),
    file: validateFile(file),
  };

  const isValid = Object.values(errors).every((message) => !message);
  return { isValid, errors };
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}
