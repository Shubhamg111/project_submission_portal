import { useRef, useState } from 'react';
import { formatFileSize, MAX_FILE_SIZE_MB } from '../utils/validation.js';

export default function FileUpload({ file, error, onFileSelected, onClear }) {
  const inputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  function handleInputChange(e) {
    const selected = e.target.files && e.target.files[0];
    if (selected) onFileSelected(selected);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = e.dataTransfer.files && e.dataTransfer.files[0];
    if (dropped) onFileSelected(dropped);
  }

  return (
    <div className="form-field form-field--full">
      <label htmlFor="project-zip">Project ZIP File</label>

      <div
        className={`file-drop${error ? ' file-drop--error' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        style={isDragOver ? { borderColor: '#a9803f' } : undefined}
      >
        <input
          ref={inputRef}
          id="project-zip"
          type="file"
          accept=".zip,application/zip"
          onChange={handleInputChange}
        />
        <p className="file-drop__label">Choose ZIP File</p>
        <p className="file-drop__hint">
          Only ZIP files are accepted &middot; max {MAX_FILE_SIZE_MB}MB
        </p>
      </div>

      {file && (
        <div className="file-chip">
          <div>
            <div className="file-chip__name">{file.name}</div>
            <div className="file-chip__size">{formatFileSize(file.size)}</div>
          </div>
          <button
            type="button"
            className="file-chip__remove"
            aria-label="Remove selected file"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
              if (inputRef.current) inputRef.current.value = '';
            }}
          >
            &times;
          </button>
        </div>
      )}

      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
