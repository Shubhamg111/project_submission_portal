export default function SuccessMessage({ submission, onReset }) {
  const { studentName, studentId, section, projectTitle, projectType, fileName } = submission;

  return (
    <div className="success-card">
      <svg
        className="success-stamp"
        width="64"
        height="64"
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="32" cy="32" r="30" stroke="#2f6d4f" strokeWidth="2" />
        <circle cx="32" cy="32" r="25" stroke="#2f6d4f" strokeWidth="1" strokeDasharray="3 3" />
        <path
          d="M21 33.5 L28 40.5 L43 24"
          stroke="#2f6d4f"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>

      <h2 className="success-title">Project Submitted Successfully</h2>
      <p className="success-lead">
        Your project has been filed and is ready for your instructor to review.
      </p>

      <dl className="receipt">
        <div className="receipt__row">
          <dt className="receipt__label">Student Name</dt>
          <dd className="receipt__value">{studentName}</dd>
        </div>
        <div className="receipt__row">
          <dt className="receipt__label">Student ID</dt>
          <dd className="receipt__value">{studentId}</dd>
        </div>
        <div className="receipt__row">
          <dt className="receipt__label">Section</dt>
          <dd className="receipt__value">{section}</dd>
        </div>
        <div className="receipt__row">
          <dt className="receipt__label">Project Title</dt>
          <dd className="receipt__value">{projectTitle}</dd>
        </div>
        <div className="receipt__row">
          <dt className="receipt__label">Project Type</dt>
          <dd className="receipt__value">{projectType}</dd>
        </div>
        <div className="receipt__row">
          <dt className="receipt__label">File</dt>
          <dd className="receipt__value">{fileName}</dd>
        </div>
      </dl>

      {/* <button type="button" className="ghost-button" onClick={onReset}>
        Submit Another Project
      </button> */}

      <p className="success-footnote">Thank you for your submission.</p>
    </div>
  );
}
