import { useState } from 'react';
import Header from './components/Header.jsx';
import SubmissionForm from './components/SubmissionForm.jsx';
import SuccessMessage from './components/SuccessMessage.jsx';
import Footer from './components/Footer.jsx';

export default function App() {
  const [submission, setSubmission] = useState(null);

  return (
    <div className="portal-page">
      <div className="portal-card">
        <Header />
        {submission ? (
          <SuccessMessage submission={submission} onReset={() => setSubmission(null)} />
        ) : (
          <SubmissionForm onSuccess={setSubmission} />
        )}
      </div>
      <Footer />
    </div>
  );
}
