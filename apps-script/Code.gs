/**
 * Student Project Submission Portal — Google Apps Script backend.
 *
 * This is the ONLY thing that ever talks to Google Drive. The React
 * frontend only knows this script's deployed Web App URL — it never sees
 * any Drive credentials.
 *
 * Deployment (see README.md for full details):
 *   Deploy > New deployment > type "Web app"
 *     - Execute as: Me
 *     - Who has access: Anyone
 *
 * Before students use the portal, run setupFolders() once from this editor
 * (function dropdown at the top > setupFolders > Run) to pre-create the
 * "Student Project Submissions" folder and all 12 section subfolders.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

var ROOT_FOLDER_NAME = 'Student Project Submissions';

// The ONLY sections the script will ever write into. The browser can send
// any string it likes, but it is always checked against this list — a
// folder name supplied by the client is never trusted directly.
var ALLOWED_SECTIONS = [
  'F251', 'F252', 'F253', 'F254', 'F255', 'F256',
  'F257', 'F258', 'F259', 'F2510', 'F2511', 'F2512',
];

// 'suffix' -> keep every submission; a repeat gets _2, _3, ... appended.
// 'reject' -> refuse a second submission that would produce the same name.
var DUPLICATE_STRATEGY = 'suffix';

// Set to false to skip writing a row to the "Submissions Log" spreadsheet.
var ENABLE_LOG = true;

// Keep this in sync with MAX_FILE_SIZE_MB in src/utils/validation.js.
// Apps Script caps a single Drive blob at 50MB, so this must stay below
// that ceiling.
var MAX_FILE_SIZE_MB = 40;

// ---------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ status: 'error', message: 'Empty request.' });
    }

    var data = JSON.parse(e.postData.contents);

    var validationError = validateSubmission(data);
    if (validationError) {
      return jsonResponse({ status: 'error', message: validationError });
    }

    var section = data.section;
    if (ALLOWED_SECTIONS.indexOf(section) === -1) {
      return jsonResponse({ status: 'error', message: 'Invalid section.' });
    }

    var sizeError = checkFileSize(data.fileData);
    if (sizeError) {
      return jsonResponse({ status: 'error', message: sizeError });
    }

    var rootFolder = getOrCreateFolder(DriveApp.getRootFolder(), ROOT_FOLDER_NAME);
    var sectionFolder = getOrCreateFolder(rootFolder, section);

    var baseFileName = generateFileName(data.studentName, data.studentId);
    var resolved = resolveFileName(sectionFolder, baseFileName);

    if (resolved.rejected) {
      return jsonResponse({
        status: 'duplicate',
        message:
          'You have already submitted a project with this name and ID. ' +
          'Please contact your instructor if you need to resubmit.',
      });
    }

    var blob = Utilities.newBlob(
      Utilities.base64Decode(data.fileData),
      'application/zip',
      resolved.fileName
    );
    sectionFolder.createFile(blob);

    if (ENABLE_LOG) {
      logSubmission(rootFolder, {
        studentName: data.studentName,
        studentId: data.studentId,
        section: section,
        projectTitle: data.projectTitle,
        projectType: data.projectType,
        fileName: resolved.fileName,
      });
    }

    return jsonResponse({
      status: 'success',
      fileName: resolved.fileName,
      section: section,
    });
  } catch (err) {
    return jsonResponse({
      status: 'error',
      message:
        'Project submission failed. Please try again. If the problem continues, contact your instructor.',
    });
  }
}

// Visiting the deployed URL in a browser shows a simple health check.
// It also doubles as a fallback verification endpoint: because Apps
// Script Web Apps deliver their response through an internal redirect,
// a POST's JSON response can occasionally fail to reach the browser even
// though doPost already finished writing the file. The frontend calls
// this GET endpoint (which does not have that redirect problem) to
// double-check whether a submission actually landed before reporting a
// failure to the student.
function doGet(e) {
  try {
    var params = (e && e.parameter) || {};
    if (params.mode === 'verify') {
      return jsonResponse(verifyRecentSubmission(params.section, params.namePrefix));
    }
    return jsonResponse({ status: 'ok', message: 'Student Project Submission Portal API is running.' });
  } catch (err) {
    return jsonResponse({ status: 'not_found' });
  }
}

/**
 * Look for a file in the given section folder whose name starts with
 * namePrefix (e.g. "Subham_Gupta_F251001") and was created in the last
 * few minutes — evidence that a just-submitted upload actually landed,
 * even if its POST response never reached the browser.
 */
function verifyRecentSubmission(section, namePrefix) {
  if (!section || !namePrefix || ALLOWED_SECTIONS.indexOf(section) === -1) {
    return { status: 'not_found' };
  }

  var rootFolder = getOrCreateFolder(DriveApp.getRootFolder(), ROOT_FOLDER_NAME);
  var sectionFolder = getOrCreateFolder(rootFolder, section);
  var files = sectionFolder.getFiles();
  var cutoff = new Date(Date.now() - 10 * 60 * 1000); // last 10 minutes
  var best = null;

  while (files.hasNext()) {
    var file = files.next();
    var name = file.getName();
    var matchesPrefix = name.indexOf(namePrefix) === 0;
    var isZip = name.toLowerCase().indexOf('.zip') !== -1;
    if (matchesPrefix && isZip && file.getDateCreated() >= cutoff) {
      if (!best || file.getDateCreated() > best.getDateCreated()) {
        best = file;
      }
    }
  }

  return best ? { status: 'success', fileName: best.getName(), section: section } : { status: 'not_found' };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateSubmission(data) {
  if (!data) return 'Missing submission data.';
  if (!isNonEmpty(data.studentName)) return 'Please enter your name.';
  if (!isNonEmpty(data.studentId)) return 'Please enter your student ID.';
  if (!isNonEmpty(data.section)) return 'Please select your section.';
  if (!isNonEmpty(data.projectTitle)) return 'Please enter your project title.';
  if (!isNonEmpty(data.projectType)) return 'Please select your project type.';
  if (!isNonEmpty(data.fileData)) return 'Please select your project ZIP file.';
  if (!data.fileName || String(data.fileName).toLowerCase().indexOf('.zip') === -1) {
    return 'Only ZIP files are allowed.';
  }
  return null;
}

function isNonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function checkFileSize(base64Data) {
  // Base64 encodes 3 bytes as 4 characters, so this estimates the decoded
  // byte size without decoding the whole payload twice.
  var approxBytes = Math.floor((base64Data.length * 3) / 4);
  var maxBytes = MAX_FILE_SIZE_MB * 1024 * 1024;
  if (approxBytes > maxBytes) {
    return 'File is too large. Maximum allowed size is ' + MAX_FILE_SIZE_MB + 'MB.';
  }
  if (approxBytes === 0) {
    return 'The uploaded file appears to be empty.';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Filename helpers
// ---------------------------------------------------------------------------

function sanitizeForFilename(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');
}

function generateFileName(studentName, studentId) {
  var cleanName = sanitizeForFilename(studentName);
  var cleanId = sanitizeForFilename(studentId);
  return cleanName + '_' + cleanId + '.zip';
}

/**
 * Decide the filename to actually write, given what's already in the
 * section folder. Returns { fileName } or { rejected: true }.
 */
function resolveFileName(folder, baseFileName) {
  if (!folder.getFilesByName(baseFileName).hasNext()) {
    return { fileName: baseFileName };
  }

  if (DUPLICATE_STRATEGY === 'reject') {
    return { rejected: true };
  }

  var stem = baseFileName.substring(0, baseFileName.lastIndexOf('.zip'));
  var counter = 2;
  var candidate;
  do {
    candidate = stem + '_' + counter + '.zip';
    counter++;
  } while (folder.getFilesByName(candidate).hasNext());

  return { fileName: candidate };
}

// ---------------------------------------------------------------------------
// Folder helpers
// ---------------------------------------------------------------------------

function getOrCreateFolder(parent, name) {
  var existing = parent.getFoldersByName(name);
  if (existing.hasNext()) {
    return existing.next();
  }
  return parent.createFolder(name);
}

// ---------------------------------------------------------------------------
// Optional submissions log (a spreadsheet inside the root folder)
// ---------------------------------------------------------------------------

function logSubmission(rootFolder, entry) {
  try {
    var sheetName = 'Submissions Log';
    var existingFiles = rootFolder.getFilesByName(sheetName);
    var spreadsheet;

    if (existingFiles.hasNext()) {
      spreadsheet = SpreadsheetApp.open(existingFiles.next());
    } else {
      spreadsheet = SpreadsheetApp.create(sheetName);
      var file = DriveApp.getFileById(spreadsheet.getId());
      rootFolder.addFile(file);
      DriveApp.getRootFolder().removeFile(file);
      spreadsheet
        .getSheets()[0]
        .appendRow(['Timestamp', 'Student Name', 'Student ID', 'Section', 'Project Title', 'Project Type', 'File Name']);
    }

    spreadsheet.getSheets()[0].appendRow([
      new Date(),
      entry.studentName,
      entry.studentId,
      entry.section,
      entry.projectTitle,
      entry.projectType,
      entry.fileName,
    ]);
  } catch (err) {
    // A logging failure should never block a successful file upload.
  }
}

// ---------------------------------------------------------------------------
// Response helper
// ---------------------------------------------------------------------------

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------
// One-time setup — run manually from the Apps Script editor before launch
// ---------------------------------------------------------------------------

function setupFolders() {
  var rootFolder = getOrCreateFolder(DriveApp.getRootFolder(), ROOT_FOLDER_NAME);
  for (var i = 0; i < ALLOWED_SECTIONS.length; i++) {
    getOrCreateFolder(rootFolder, ALLOWED_SECTIONS[i]);
  }
  Logger.log('Folder structure ready under "' + ROOT_FOLDER_NAME + '".');
}
