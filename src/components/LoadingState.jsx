/**
 * Small inline spinner used inside the submit button (and anywhere else a
 * lightweight "working on it" indicator is needed).
 */
export default function LoadingState({ label = 'Uploading...' }) {
  return (
    <>
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </>
  );
}
