export type CsvRecord = Readonly<{ fields: readonly string[]; line: number }>;
export type ParsedCsv =
  | { ok: true; records: readonly CsvRecord[] }
  | { ok: false; line: number; message: string };

/** Comma-separated records with quoted fields, escaped quotes, BOM, and CR/LF support. */
export function parseCsv(source: string): ParsedCsv {
  const text = source.replace(/^\uFEFF/, '');
  const records: CsvRecord[] = [];
  let fields: string[] = [];
  let field = '';
  let state: 'unquoted' | 'quoted' | 'closed' = 'unquoted';
  let line = 1;
  let startLine = 1;
  let touched = false;

  function finishRecord() {
    fields.push(field);
    records.push({ fields, line: startLine });
    fields = [];
    field = '';
    state = 'unquoted';
    touched = false;
  }

  for (let index = 0; index < text.length; index++) {
    const char = text[index]!;
    if (state === 'quoted') {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index++;
        } else state = 'closed';
      } else if (char === '\r' || char === '\n') {
        if (char === '\r' && text[index + 1] === '\n') index++;
        field += '\n';
        line++;
      } else field += char;
      continue;
    }
    if (char === ',') {
      fields.push(field);
      field = '';
      state = 'unquoted';
      touched = true;
    } else if (char === '\r' || char === '\n') {
      finishRecord();
      if (char === '\r' && text[index + 1] === '\n') index++;
      line++;
      startLine = line;
    } else if (state === 'closed') {
      if (char !== ' ' && char !== '\t')
        return {
          ok: false,
          line,
          message: 'Unexpected text after a closing quote.',
        };
    } else if (char === '"') {
      if (field.trim() !== '')
        return {
          ok: false,
          line,
          message:
            'A quote must begin a CSV field or be escaped inside a quoted field.',
        };
      field = '';
      state = 'quoted';
      touched = true;
    } else {
      field += char;
      touched = true;
    }
  }
  if (state === 'quoted')
    return {
      ok: false,
      line: startLine,
      message: 'A quoted field was not closed.',
    };
  if (touched || fields.length > 0 || field !== '') finishRecord();
  return { ok: true, records };
}
