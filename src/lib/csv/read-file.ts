import { blocking } from './import-schedule.ts';

export const MAX_CSV_BYTES = 1024 * 1024;
export type CsvFile = Pick<File, 'name' | 'size' | 'arrayBuffer'>;
export type ReadFileResult =
  { kind: 'text'; text: string } | ReturnType<typeof blocking>;

export async function readCsvFile(file: CsvFile): Promise<ReadFileResult> {
  if (!/\.csv$/i.test(file.name))
    return blocking('FILE_TYPE', 'Choose a CSV file with a .csv extension.');
  if (file.size > MAX_CSV_BYTES)
    return blocking(
      'FILE_TOO_LARGE',
      'This file is larger than 1 MiB. Choose a smaller daily schedule CSV.',
    );
  if (file.size === 0)
    return blocking(
      'FILE_EMPTY',
      'No schedule data was found in this file. Download the current CSV and try again.',
    );
  let bytes: ArrayBuffer;
  try {
    bytes = await file.arrayBuffer();
  } catch {
    return blocking(
      'FILE_UNREADABLE',
      'This file could not be read. Choose the file again.',
    );
  }
  try {
    return {
      kind: 'text',
      text: new TextDecoder('utf-8', { fatal: true }).decode(bytes),
    };
  } catch {
    return blocking(
      'FILE_ENCODING',
      'This file could not be read as UTF-8. Export it as a UTF-8 CSV and try again.',
    );
  }
}
