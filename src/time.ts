const pad2 = (n: number): string => n < 10 ? `0${n}` : `${n}`;
const pad3 = (n: number): string => n < 10 ? `00${n}` : n < 100 ? `0${n}` : `${n}`;
const pad4 = (n: number): string => {
  if (n < 10) return `000${n}`;
  if (n < 100) return `00${n}`;
  if (n < 1000) return `0${n}`;
  return `${n}`;
};

interface DateParts {
  yyyy: string;
  mm: string;
  dd: string;
  HH: string;
  MM: string;
  ss: string;
  l: string;
}

function getDateParts(date: Date, utc: boolean): DateParts {
  if (utc) {
    return {
      yyyy: pad4(date.getUTCFullYear()),
      mm: pad2(date.getUTCMonth() + 1),
      dd: pad2(date.getUTCDate()),
      HH: pad2(date.getUTCHours()),
      MM: pad2(date.getUTCMinutes()),
      ss: pad2(date.getUTCSeconds()),
      l: pad3(date.getUTCMilliseconds()),
    };
  }
  return {
    yyyy: pad4(date.getFullYear()),
    mm: pad2(date.getMonth() + 1),
    dd: pad2(date.getDate()),
    HH: pad2(date.getHours()),
    MM: pad2(date.getMinutes()),
    ss: pad2(date.getSeconds()),
    l: pad3(date.getMilliseconds()),
  };
}

// Tokens sorted by length (longest first) to avoid partial matches
const TOKEN_ORDER: (keyof DateParts)[] = ["yyyy", "mm", "dd", "HH", "MM", "ss", "l"];

export function formatTime(epochMs: number, format: string): string {
  let utc = false;
  let fmt = format;

  if (fmt.startsWith("UTC:")) {
    utc = true;
    fmt = fmt.slice(4);
  }

  const date = new Date(epochMs);
  const parts = getDateParts(date, utc);

  let result = fmt;
  for (const token of TOKEN_ORDER) {
    result = result.replaceAll(token, parts[token]);
  }

  return result;
}
