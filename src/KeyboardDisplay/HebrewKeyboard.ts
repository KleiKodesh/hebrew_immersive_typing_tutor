/**
 * Shared Hebrew keyboard layout constants and geometry helpers.
 * Used by both KeyboardDisplay and HandSimulator (dev tool).
 */

// ── Layout ────────────────────────────────────────────────────────────────────

export const KEYBOARD_HE: string[][] = [
  ['`~', '1!', '2@', '3#', '4$', '5%', '6^', '7&', '8*', '9(', '0)', '-_', '=+', 'Backspace'],
  ['Tab', '/', '\'', 'ק', 'ר', 'א', 'ט', 'ו', 'ן', 'ם', 'פ', '[{', ']}', '\\|'],
  ['Caps', 'ש', 'ד', 'ג', 'כ', 'ע', 'י', 'ח', 'ל', 'ך', 'ף:', ',"', 'Enter'],
  ['LShift', 'ז', 'ס', 'ב', 'ה', 'נ', 'מ', 'צ', 'ת', 'ץ', '.?', 'Shift'],
  ['Ctrl', 'Win', 'Alt', 'Space', 'Alt', 'Fn', 'Ctrl'],
]

export const HOME_ROW_HE = KEYBOARD_HE[2]
export const SPACE_ROW    = KEYBOARD_HE[4]

/** Key widths in flex units (1 = standard key width). */
export const KEY_UNITS: Record<string, number> = {
  Backspace: 1.5, Tab: 1.5, Caps: 1.7, Enter: 2.1,
  LShift: 1.9, Shift: 2.4, Ctrl: 1.1, Win: 1.1, Alt: 1.1, Fn: 1.0, Space: 5.5,
}

// ── Key identity ──────────────────────────────────────────────────────────────

/** Characters that can only appear as the *shifted* legend of a dual key. */
export const DUAL_SECOND_CHARS = new Set([
  '~','!','@','#','$','%','^','&','*','(',')',
  '_','+','{','}','|','"','<','>','?','\\',':','״',
])

/** True for a two-legend key such as 'ף:' or '9(' — as opposed to 'ק' or 'Enter'. */
export function isDualKey(key: string): boolean {
  return key.length === 2 && DUAL_SECOND_CHARS.has(key.charAt(1))
}

export function normalizeKey(key: string): string {
  if (key === ' ')      return 'Space'
  if (key === 'LShift') return 'Shift'
  return key
}

/**
 * True when `probe` (a target character or a KeyboardEvent.key) is produced by `key`.
 * Dual keys match on BOTH legends, so shifted characters — ? " : ! ( — light up too.
 */
export function keyMatches(key: string, probe: string): boolean {
  if (!probe) return false
  const p = normalizeKey(probe)
  const label = normalizeKey(key)
  if (label === p) return true
  if (isDualKey(key) && (key.charAt(0) === p || key.charAt(1) === p)) return true
  // Latin layout: a typed 'A' belongs to the 'a' key
  return label.length === 1 && p.length === 1 && label.toLowerCase() === p.toLowerCase()
}

// ── Finger assignments ────────────────────────────────────────────────────────

/** Maps a Hebrew character (or symbol) to the finger that types it. */
export const FINGER_MAP: Record<string, string> = {
  '`': 'left-pinky',  '~': 'left-pinky',
  '1': 'left-pinky',  '!': 'left-pinky',
  '2': 'left-ring',   '@': 'left-ring',
  '3': 'left-middle', '#': 'left-middle',
  '4': 'left-index',  '$': 'left-index',
  '5': 'left-index',  '%': 'left-index',
  '6': 'right-index', '^': 'right-index',
  '7': 'right-index', '&': 'right-index',
  '8': 'right-middle','*': 'right-middle',
  '9': 'right-ring',  '(': 'right-ring',
  '0': 'right-pinky', ')': 'right-pinky',
  '-': 'right-pinky', '_': 'right-pinky',
  '=': 'right-pinky', '+': 'right-pinky',
  'ק': 'left-middle', 'ר': 'left-index',
  'א': 'left-index',  'ט': 'right-index', 'ו': 'right-index',
  'ן': 'right-middle','ם': 'right-ring',
  'פ': 'right-pinky',
  'ש': 'left-pinky',  'ד': 'left-ring',
  'ג': 'left-middle', 'כ': 'left-index',
  'ע': 'left-index',  'י': 'right-index',
  'ח': 'right-index', 'ל': 'right-middle',
  'ך': 'right-ring',  'ף': 'right-pinky',
  'ז': 'left-pinky',  'ס': 'left-ring',
  'ב': 'left-middle', 'ה': 'left-index',
  'נ': 'left-index',  'מ': 'right-index',
  'צ': 'right-index', 'ת': 'right-middle',
  'ץ': 'right-ring',
  '[': 'right-pinky', ']': 'right-pinky',
  '{': 'right-pinky', '}': 'right-pinky',
  '\\': 'right-pinky','|': 'right-pinky',
  // Punctuation, keyed by its physical position on the Hebrew layout
  '/': 'left-pinky',  '\'': 'left-ring',
  ',': 'right-pinky', '"': 'right-pinky', '״': 'right-pinky',
  ';': 'right-pinky', ':': 'right-pinky',
  '.': 'right-pinky', '?': 'right-pinky',
  ' ': 'thumb',
}

/** Maps a Hebrew character to its keyboard row index (0 = number row, 4 = space row). */
export const KEY_ROW_HE: Record<string, number> = {
  '`':0,'~':0,'1':0,'!':0,'2':0,'@':0,'3':0,'#':0,'4':0,'$':0,'5':0,'%':0,
  '6':0,'^':0,'7':0,'&':0,'8':0,'*':0,'9':0,'(':0,'0':0,')':0,'-':0,'_':0,'=':0,'+':0,
  '/':1,"'":1,'ק':1,'ר':1,'א':1,'ט':1,'ו':1,'ן':1,'ם':1,'פ':1,']':1,'[':1,'}':1,'{':1,'\\':1,'|':1,
  'ש':2,'ד':2,'ג':2,'כ':2,'ע':2,'י':2,'ח':2,'ל':2,'ך':2,'ף':2,
  'ז':3,'ס':3,'ב':3,'ה':3,'נ':3,'מ':3,'צ':3,'ת':3,'ץ':3,
  // ',' and '"' sit on the home row (the key right of ף); '.' and '?' on the bottom row
  ',':2,'"':2,'״':2,';':2,':':2,
  '.':3,'?':3,
  ' ':4,
}

/** Home key for each finger (Hebrew layout). */
export const FINGER_HOME_KEY_HE: Record<string, string> = {
  'left-pinky':  'ש', 'left-ring':   'ד',
  'left-middle': 'ג', 'left-index':  'כ',
  'right-index': 'י', 'right-middle':'ל',
  'right-ring':  'ך', 'right-pinky': 'ף:',
  'thumb': 'Space',
}

// ── Hand geometry ─────────────────────────────────────────────────────────────

/** Hand SVG width as a fraction of keyboard width. */
export const HAND_W = 0.28

/**
 * Finger tip positions in SVG viewBox (0–32), right hand unmirrored.
 * Left hand mirrors X: leftX = 32 − rightX.
 */
export const FINGER_TIP: Record<string, { x: number; y: number }> = {
  'right-pinky':  { x: 29.5, y: 8.7  },
  'right-ring':   { x: 22.2, y: 3.4  },
  'right-middle': { x: 14.5, y: 2.6  },
  'right-index':  { x: 6.9,  y: 7.7  },
  'right-thumb':  { x: 2.9,  y: 26.8 },
  'left-pinky':   { x: 32 - 29.5, y: 8.7  },
  'left-ring':    { x: 32 - 22.2, y: 3.4  },
  'left-middle':  { x: 32 - 14.5, y: 2.6  },
  'left-index':   { x: 32 - 6.9,  y: 7.7  },
  'left-thumb':   { x: 32 - 2.9,  y: 26.8 },
}

// ── Geometry helpers ──────────────────────────────────────────────────────────

/** Returns the horizontal centre of a key as a fraction [0,1] of the row's total width. */
export function keyCenterFrac(row: string[], targetKey: string): number {
  const units = row.map(k => KEY_UNITS[k] ?? 1)
  const total = units.reduce((a, b) => a + b, 0)
  let acc = 0
  for (let i = 0; i < row.length; i++) {
    const u = units[i]
    if (row[i] === targetKey || row[i].includes(targetKey)) return (acc + u / 2) / total
    acc += u
  }
  return 0.5
}

/** Returns the vertical centre of a keyboard row as a fraction [0,1] of keyboard height. */
export function rowCenterFrac(row: number): number {
  return (row + 0.5) / 5
}

/** Returns the horizontal centre fraction for the finger that types `key`. */
export function fingerColumnFrac(fingerId: string, key: string): number {
  if (fingerId === 'thumb' || fingerId === 'left-thumb' || fingerId === 'right-thumb') {
    return keyCenterFrac(SPACE_ROW, 'Space')
  }
  const rowIdx = KEY_ROW_HE[key] ?? 2
  const keyboardRow = KEYBOARD_HE[rowIdx]
  if (keyboardRow) {
    const frac = keyCenterFrac(keyboardRow, key)
    if (frac !== 0.5) return frac
  }
  const homeKey = FINGER_HOME_KEY_HE[fingerId] ?? 'כ'
  return keyCenterFrac(HOME_ROW_HE, homeKey)
}

/**
 * Computes the hand overlay position (left%, top%) so the finger tip lands on the target key.
 * Calibrated absolute positions are used for thumbs.
 */
export function computeHandPos(
  fingerId: string,
  key: string,
  row: number,
  kbWidth: number,
  kbHeight: number,
): { leftPct: number; topPct: number } {
  const handPx  = kbWidth * HAND_W
  const tip     = FINGER_TIP[fingerId] ?? { x: 16, y: 8 }
  const tipXpx  = (tip.x / 32) * handPx
  const tipYpx  = (tip.y / 32) * handPx
  const targetXpx = fingerColumnFrac(fingerId, key) * kbWidth
  const targetYpx = rowCenterFrac(row) * kbHeight
  let leftPct = ((targetXpx - tipXpx) / kbWidth)  * 100
  let topPct  = ((targetYpx - tipYpx) / kbHeight) * 100

  // Calibrated absolute positions for thumbs — override geometry entirely
  if (fingerId === 'left-thumb') {
    return { leftPct: 18.89356060606061, topPct: 10.80415584415583 }
  }
  if (fingerId === 'right-thumb') {
    return { leftPct: 53.50687229437229, topPct: 14.267359307359285 }
  }
  if (fingerId === 'thumb') {
    leftPct += 12.368421052631575
    topPct  += -54.736842105263165
  }

  return { leftPct, topPct }
}

/** The Hebrew letter Ayin (ע), used for accuracy tracking. */
export const AYIN = 'ע'
