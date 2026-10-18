'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useRef } from 'react';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TIME_SLOTS } from '@/domain/schedule';

export function CsvFormatDialog({ disabled = false }: { disabled?: boolean }) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button hierarchy="ghost" disabled={disabled}>
          <Info size={20} aria-hidden="true" />
          CSV format
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="dialog-content"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            titleRef.current?.focus();
          }}
        >
          <Dialog.Title
            ref={titleRef}
            tabIndex={-1}
            className="text-lg font-semibold"
          >
            CSV format
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-text-secondary">
            Download the saved schedule shown on this page, edit it, then upload
            your file to replace the whole selected day.
          </Dialog.Description>
          <ul className="my-5 list-disc space-y-2 pl-5 text-sm">
            <li>Use a UTF-8 .csv file up to 1 MiB.</li>
            <li>
              Keep one row for every current staff member, including people who
              are off duty.
            </li>
            <li>Use the selected date and a unique staff ID on each row.</li>
            <li>
              Keep all eight time columns. Use TRUE, FALSE or a blank cell.
              Blank means not scheduled.
            </li>
            <li>
              Each person may be off duty or work one continuous period of at
              least 3 hours. Split shifts are not allowed.
            </li>
          </ul>
          <h3 className="text-sm font-semibold">Required columns</h3>
          <div
            className="csv-columns mt-2 rounded-control bg-surface-muted p-3 text-xs"
            tabIndex={0}
            role="region"
            aria-label="Required CSV columns"
          >
            <code>{['date', 'staff_id', ...TIME_SLOTS].join(',')}</code>
          </div>
          <div className="mt-6 flex justify-end">
            <Dialog.Close asChild>
              <Button hierarchy="secondary">Close</Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
