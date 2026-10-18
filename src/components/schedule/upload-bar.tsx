'use client';

import { useId, type Ref } from 'react';
import { Download, Info, Loader, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CsvFormatDialog } from './csv-format-dialog';

const PROCESSING_NOTES = {
  checking:
    'Please wait until the file check finishes before downloading or uploading again.',
  applying:
    'Please wait until the update finishes before downloading or uploading again.',
};

type UploadBarProps = {
  onDownloadAction: () => void;
  onChooseFileAction: () => void;
  uploadButtonRef: Ref<HTMLButtonElement>;
  processing: 'checking' | 'applying' | null;
  unavailable: boolean;
  reloadRequired: boolean;
  hasSchedule: boolean;
};

export function UploadBar({
  onDownloadAction,
  onChooseFileAction,
  uploadButtonRef,
  processing,
  unavailable,
  reloadRequired,
  hasSchedule,
}: UploadBarProps) {
  const noteId = useId();
  const busyId = useId();
  const note = reloadRequired
    ? 'Reload the schedule before downloading or uploading again.'
    : !hasSchedule
      ? 'Uploading is available once the schedule has loaded.'
      : 'Uploading replaces the schedule for this day.';

  return (
    <section className="upload-bar" aria-label="CSV schedule actions">
      <div className="upload-copy">
        <h2 className="text-sm leading-5 font-semibold">
          Update this day from a CSV file
        </h2>
        <p className="text-xs leading-4 text-text-secondary">
          Accepted values: TRUE, FALSE or blank. Each person works one
          continuous block of 3 hours or more, or not at all.
        </p>
        <p
          id={noteId}
          className={`replace-note${reloadRequired || !hasSchedule ? ' replace-note--unavailable' : ''}`}
        >
          <Info size={14} aria-hidden="true" />
          {note}
        </p>
        <div className="upload-processing-note">
          {/* Reserve both wrapped messages without exposing duplicate speech. */}
          {Object.entries(PROCESSING_NOTES).map(([state, text]) => (
            <span
              key={state}
              className="upload-processing-note-sizer"
              aria-hidden="true"
            >
              {text}
            </span>
          ))}
          {processing && <p id={busyId}>{PROCESSING_NOTES[processing]}</p>}
        </div>
      </div>
      <div className="upload-actions">
        <CsvFormatDialog disabled={Boolean(processing)} />
        <Button
          hierarchy="secondary"
          disabled={unavailable}
          aria-describedby={processing ? busyId : noteId}
          onClick={onDownloadAction}
        >
          <Download size={20} aria-hidden="true" />
          Download CSV
        </Button>
        <Button
          ref={uploadButtonRef}
          className="upload-button"
          disabled={unavailable}
          busy={Boolean(processing)}
          aria-busy={false}
          focusableWhenDisabled={Boolean(processing)}
          onClick={onChooseFileAction}
          aria-describedby={noteId}
        >
          {processing ? (
            <Loader size={20} className="processing-icon" aria-hidden="true" />
          ) : (
            <Upload size={20} aria-hidden="true" />
          )}
          <span>Upload CSV</span>
        </Button>
      </div>
    </section>
  );
}
