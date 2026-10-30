type Visual = "c" | "g" | "g4" | "m" | "s";
type PaletteEntry = string | Partial<Record<Visual, string>>;

interface Xpm2Spec {
  palette: Record<string, PaletteEntry>;
  grid: string[];
}

const MAX_COLORS = 32;
const VISUALS: Visual[] = ["m", "g4", "g", "c", "s"];

function normalizeColor(color: string): string {
  if (color.charAt(0) !== "#") return color;
  return color.length === 9 ? color.slice(0, 7) : color;
}

function paletteLine(symbol: string, entry: PaletteEntry): string {
  if (typeof entry === "string") return `${symbol} c ${normalizeColor(entry)}`;

  const parts: string[] = [];
  for (const visual of VISUALS) {
    const value = entry[visual];
    if (value !== undefined) parts.push(`${visual} ${normalizeColor(value)}`);
  }
  if (parts.length === 0) throw new Error(`xpm2: empty palette entry "${symbol}"`);
  return `${symbol} ${parts.join(" ")}`;
}

export function generateXpm2({ palette, grid }: Xpm2Spec): string {
  const symbols = Object.keys(palette);
  const height = grid.length;
  const width = height > 0 ? grid[0].length : 0;
  if (width === 0 || height === 0) throw new Error("xpm2: empty grid");
  if (symbols.length === 0 || symbols.length > MAX_COLORS) {
    throw new Error("xpm2: invalid palette size");
  }

  const cpp = symbols[0].length;
  if (cpp < 1 || cpp > 4 || symbols.some((symbol) => symbol.length !== cpp)) {
    throw new Error("xpm2: invalid symbol length");
  }

  const lines = ["! XPM2", `${width / cpp} ${height} ${symbols.length} ${cpp}`];
  for (const symbol of symbols) lines.push(paletteLine(symbol, palette[symbol]));
  for (const row of grid) {
    if (row.length !== width) throw new Error("xpm2: inconsistent row width");
    lines.push(row);
  }
  return lines.join("\n");
}

export function scaleGrid(grid: string[], factor: number, cpp = 1): string[] {
  if (factor <= 1) return grid;
  const out: string[] = [];
  for (const row of grid) {
    let wide = "";
    for (let x = 0; x < row.length; x += cpp) {
      wide += row.slice(x, x + cpp).repeat(factor);
    }
    for (let y = 0; y < factor; y += 1) out.push(wide);
  }
  return out;
}
