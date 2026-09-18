/**
 * Filename generation utilities.
 *
 * The Google Drive filename is ALWAYS derived from the student's name and ID,
 * never from the original uploaded file's name (see Code.gs for the
 * server-side counterpart used for duplicate suffixing).
 */

/**
 * Clean a string so it is safe to use inside a filename:
 * - trims whitespace
 * - collapses internal whitespace to a single underscore
 * - strips characters that are unsafe on common filesystems / Drive
 * - collapses repeated underscores
 */
export function sanitizeForFilename(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Build the final "StudentName_StudentID.zip" filename.
 * Project title is intentionally excluded, per spec.
 */
export function generateFilename(studentName, studentId) {
  const cleanName = sanitizeForFilename(studentName);
  const cleanId = sanitizeForFilename(studentId);
  return `${cleanName}_${cleanId}.zip`;
}
