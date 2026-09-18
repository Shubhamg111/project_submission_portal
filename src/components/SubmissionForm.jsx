import { useState } from 'react';
import FileUpload from './FileUpload.jsx';
import LoadingState from './LoadingState.jsx';
import { SECTIONS, PROJECT_TYPES, validateForm } from '../utils/validation.js';
import { submitProject, SubmissionError } from '../services/googleDrive.js';

const EMPTY_FORM = {
  studentName: '',
  studentId: '',
  section: '',
  projectTitle: '',
  projectType: '',
};

export default function SubmissionForm({ onSuccess }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: null } : prev));
  }

  function handleFileSelected(selected) {
    setFile(selected);
    setErrors((prev) => (prev.file ? { ...prev, file: null } : prev));
  }

  function handleFileClear() {
    setFile(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isSubmitting) return;

    const { isValid, errors: validationErrors } = validateForm({ ...form, file });
    setErrors(validationErrors);
    setSubmitError(null);
    if (!isValid) return;

    setIsSubmitting(true);
    try {
      const result = await submitProject({ ...form, file });
      onSuccess({
        studentName: form.studentName.trim(),
        studentId: form.studentId.trim(),
        section: form.section,
        projectTitle: form.projectTitle.trim(),
        projectType: form.projectType,
        fileName: result.fileName || `${form.studentName}_${form.studentId}.zip`,
      });
    } catch (err) {
      const message =
        err instanceof SubmissionError
          ? err.userMessage
          : 'Project submission failed. Please try again. If the problem continues, contact your instructor.';
      setSubmitError(message);
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="form-grid">
        <div className={`form-field${errors.studentName ? ' form-field--error' : ''}`}>
          <label htmlFor="studentName">Student Name</label>
          <input
            id="studentName"
            type="text"
            value={form.studentName}
            onChange={(e) => updateField('studentName', e.target.value)}
            disabled={isSubmitting}
            autoComplete="name"
          />
          {errors.studentName && <p className="field-error">{errors.studentName}</p>}
        </div>

        <div className={`form-field${errors.studentId ? ' form-field--error' : ''}`}>
          <label htmlFor="studentId">Student ID</label>
          <input
            id="studentId"
            type="text"
            value={form.studentId}
            onChange={(e) => updateField('studentId', e.target.value)}
            disabled={isSubmitting}
            autoComplete="off"
          />
          {errors.studentId && <p className="field-error">{errors.studentId}</p>}
        </div>

        <div className={`form-field${errors.section ? ' form-field--error' : ''}`}>
          <label htmlFor="section">Section</label>
          <select
            id="section"
            value={form.section}
            onChange={(e) => updateField('section', e.target.value)}
            disabled={isSubmitting}
          >
            <option value="">Select Section</option>
            {SECTIONS.map((sec) => (
              <option key={sec} value={sec}>
                {sec}
              </option>
            ))}
          </select>
          {errors.section && <p className="field-error">{errors.section}</p>}
        </div>

        <div className={`form-field${errors.projectTitle ? ' form-field--error' : ''}`}>
          <label htmlFor="projectTitle">Project Title</label>
          <input
            id="projectTitle"
            type="text"
            value={form.projectTitle}
            onChange={(e) => updateField('projectTitle', e.target.value)}
            disabled={isSubmitting}
            autoComplete="off"
          />
          {errors.projectTitle && <p className="field-error">{errors.projectTitle}</p>}
        </div>

        <div className={`form-field${errors.projectType ? ' form-field--error' : ''}`}>
          <label htmlFor="projectType">Project Type</label>
          <select
            id="projectType"
            value={form.projectType}
            onChange={(e) => updateField('projectType', e.target.value)}
            disabled={isSubmitting}
          >
            <option value="">Select Project Type</option>
            {PROJECT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {errors.projectType && <p className="field-error">{errors.projectType}</p>}
        </div>

        <FileUpload
          file={file}
          error={errors.file}
          onFileSelected={handleFileSelected}
          onClear={handleFileClear}
        />
      </div>

      <button type="submit" className="submit-button" disabled={isSubmitting}>
        {isSubmitting ? <LoadingState label="Uploading..." /> : 'Submit Project'}
      </button>

      {submitError && <div className="submit-banner submit-banner--error">{submitError}</div>}
    </form>
  );
}
