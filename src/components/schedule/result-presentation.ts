import type { UploadResult } from '../../domain/upload.ts';
import { formatDay } from '../../domain/format-date.ts';

export const RELOADED_NOTICE =
  'If you edited a CSV downloaded before this reload, download a fresh copy and transfer your changes before uploading.';

type Presentation = {
  title: string;
  variant:
    | 'processing'
    | 'blocking'
    | 'corrections'
    | 'success'
    | 'warning'
    | 'system';
  icon: 'loader' | 'stop' | 'alert' | 'check' | 'warning' | 'refresh' | 'info';
  outcome?: string;
  description?: string;
  focus?: boolean;
};

export function describeResult(
  result: UploadResult,
  date: string,
): Presentation | null {
  switch (result.kind) {
    case 'ready':
    case 'load-error':
      return null;
    case 'checking':
      return {
        title: 'Checking the CSV file…',
        variant: 'processing',
        icon: 'loader',
      };
    case 'applying':
      return {
        title: `Applying the schedule for ${formatDay(date)}…`,
        variant: 'processing',
        icon: 'loader',
      };
    case 'reloading':
      return {
        title: 'Reloading the saved schedule…',
        variant: 'processing',
        icon: 'loader',
      };
    case 'blocking':
      return {
        title: 'This file can’t be used',
        variant: 'blocking',
        icon: 'stop',
        outcome: 'Not changed',
        focus: true,
      };
    case 'corrections':
      return {
        title: `${result.issues.length} ${result.issues.length === 1 ? 'problem needs' : 'problems need'} correcting in the file`,
        variant: 'corrections',
        icon: 'alert',
        outcome: 'Not changed',
        focus: true,
      };
    case 'applied':
      return {
        title: result.warnings.length
          ? 'Schedule updated with warnings'
          : 'Upload complete',
        variant: result.warnings.length ? 'warning' : 'success',
        icon: result.warnings.length ? 'warning' : 'check',
        outcome: `Updated for ${formatDay(date)}`,
      };
    case 'conflict':
      return {
        title: 'This day’s schedule has changed since it was loaded',
        variant: 'system',
        icon: 'refresh',
        outcome: 'Not changed by this attempt',
        description:
          'Reload to review the latest version before uploading again.',
        focus: true,
      };
    case 'unknown':
      return {
        title: 'We couldn’t confirm whether the schedule was updated',
        variant: 'system',
        icon: 'refresh',
        outcome: 'Result unknown',
        description:
          'The connection was lost before the server replied. Reload to see the saved schedule before uploading again.',
        focus: true,
      };
    case 'reloaded':
      return {
        title: 'Latest schedule loaded',
        variant: 'system',
        icon: 'info',
        description: RELOADED_NOTICE,
        focus: true,
      };
  }
}
