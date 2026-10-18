'use client';

import { useEffect, useId, useRef } from 'react';
import {
  CircleAlert,
  CircleCheck,
  Download,
  Info,
  Loader,
  OctagonX,
  RefreshCw,
  TriangleAlert,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { describeResult } from './result-presentation';
import { formatPeriod } from '@/domain/validate-schedule';
import type { UploadIssue, UploadResult } from '@/domain/upload';

function ResultItem({
  location,
  message,
  enteredValue,
}: Pick<UploadIssue, 'location' | 'message' | 'enteredValue'>) {
  return (
    <li className="result-item">
      <span className="result-location">{location}</span>
      <div className="result-detail">
        <p>{message}</p>
        {enteredValue !== undefined && (
          <p className="entered-value">Entered: {enteredValue}</p>
        )}
      </div>
    </li>
  );
}

export function ResultPanel({
  result,
  date,
  onChooseFileAction,
  onDownloadAction,
  onReloadAction,
}: {
  result: UploadResult;
  date: string;
  onChooseFileAction: () => void;
  onDownloadAction: () => void;
  onReloadAction: () => void;
}) {
  const titleId = useId();
  const outcomeId = useId();
  const descriptionId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const presentation = describeResult(result, date);
  useEffect(() => {
    if (presentation?.focus) heading.current?.focus();
  }, [result, presentation?.focus]);
  if (!presentation) return null;
  const { title, variant, outcome, description } = presentation;
  const icons = {
    loader: Loader,
    stop: OctagonX,
    alert: CircleAlert,
    check: CircleCheck,
    warning: TriangleAlert,
    refresh: RefreshCw,
    info: Info,
  };
  const Icon = icons[presentation.icon];
  const processing = variant === 'processing';
  const describedBy =
    [outcome ? outcomeId : null, description ? descriptionId : null]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <section
      className={`result-panel result-panel--${variant}`}
      aria-labelledby={titleId}
    >
      <div className="result-header">
        <Icon
          aria-hidden="true"
          size={20}
          className={processing ? 'processing-icon' : undefined}
        />
        <h2
          id={titleId}
          ref={heading}
          tabIndex={-1}
          aria-describedby={describedBy}
        >
          {title}
        </h2>
      </div>
      <div className="result-body">
        {(result.kind === 'checking' || result.kind === 'applying') && (
          <p className="processing-filename">{result.filename}</p>
        )}
        {outcome && (
          <div id={outcomeId} className="result-outcome">
            <p>Saved schedule</p>
            <p>{outcome}</p>
          </div>
        )}
        {description && (
          <p
            id={descriptionId}
            className={`result-description${result.kind === 'reloaded' ? ' result-description--notice' : ''}`}
          >
            {description}
          </p>
        )}
        {(result.kind === 'conflict' || result.kind === 'unknown') && (
          <div className="result-actions">
            <Button onClick={onReloadAction}>
              <RefreshCw size={20} aria-hidden="true" />
              Reload
            </Button>
          </div>
        )}
        {result.kind === 'blocking' && (
          <ul className="result-items">
            <ResultItem {...result.issue} />
          </ul>
        )}
        {result.kind === 'corrections' && (
          <>
            <ul className="result-items">
              {result.issues.map((issue, index) => (
                <ResultItem key={`${issue.code}-${index}`} {...issue} />
              ))}
            </ul>
            <p className="result-hint">
              Each problem is listed once. Fix them in the file and choose it
              again.
            </p>
          </>
        )}
        {result.kind === 'applied' && result.warnings.length > 0 && (
          <ul className="result-items">
            {result.warnings.map((item) => (
              <ResultItem
                key={`${item.start}-${item.end}`}
                location={formatPeriod(item.start, item.end)}
                message={
                  item.count === 0
                    ? 'No one is scheduled.'
                    : 'Only 1 person is scheduled.'
                }
              />
            ))}
          </ul>
        )}
        {(result.kind === 'blocking' || result.kind === 'corrections') && (
          <div className="result-actions">
            <Button onClick={onChooseFileAction}>
              <Upload size={20} aria-hidden="true" />
              {result.kind === 'blocking'
                ? 'Choose another file'
                : 'Choose corrected file'}
            </Button>
            {result.kind === 'blocking' && (
              <Button hierarchy="secondary" onClick={onDownloadAction}>
                <Download size={20} aria-hidden="true" />
                Download CSV
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
