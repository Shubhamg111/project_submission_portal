export default function Header() {
  return (
    <header className="masthead">
      <img
        className="masthead__logo"
        src="/techspire-logo.png"
        alt="Techspire College, in academic collaboration with Asia Pacific University of Technology & Innovation"
      />
      <h1 className="masthead__title">Student Project Submission</h1>
      <p className="masthead__instruction">
        Submit your completed project as a ZIP file below. It will be filed
        directly into your section's folder for your instructor to review.
      </p>
      <div className="masthead__rule">
        <div />
        <div />
      </div>
    </header>
  );
}
