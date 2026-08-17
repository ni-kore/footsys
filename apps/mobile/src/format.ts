import type { CountryCode, SquadRole } from '@footsys/engine';
import countries from '../../../data/core/countries.json';

/** Marktwert kurz: 1,2 Mio. € / 850 Tsd. € */
export function money(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `${millions >= 100 ? Math.round(millions) : millions.toFixed(1).replace('.', ',')} Mio. €`;
  }
  return `${Math.round(value / 1000)} Tsd. €`;
}

const ROLE_LABEL: Record<SquadRole, string> = {
  starter: 'Stammspieler',
  high_rotation: 'Rotation',
  low_rotation: 'Ergänzung',
  substitute: 'Ersatzbank',
};

export function roleLabel(role: SquadRole): string {
  return ROLE_LABEL[role];
}

/** Saison als „26/27". */
export function seasonLabel(year: number): string {
  return `${String(year % 100).padStart(2, '0')}/${String((year + 1) % 100).padStart(2, '0')}`;
}

/**
 * Flaggen-Emoji zum FIFA-Code.
 *
 * Der FIFA-Code ist nicht der ISO-Code — aus dem FIFA-Code allein lässt sich
 * keine Flagge ableiten (ARM wäre sonst Argentinien). Die Zuordnung steht
 * deshalb als `iso2` in den Länderdaten. Die vier britischen Verbände haben
 * keinen ISO-Code und bekommen ihre Unicode-Sonderflaggen.
 */
const BRITISH_FLAGS: Record<string, string> = {
  ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  SCO: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  WAL: '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  NIR: '🇬🇧',
};

const ISO_BY_FIFA = new Map<string, string>();
for (const country of countries) {
  ISO_BY_FIFA.set(country.code, country.iso2 ?? '');
}

export function flag(code: CountryCode): string {
  const british = BRITISH_FLAGS[code];
  if (british) return british;

  const iso = ISO_BY_FIFA.get(code);
  if (!iso || iso.length !== 2) return code;

  const base = 0x1f1e6;
  return String.fromCodePoint(base + iso.charCodeAt(0) - 65, base + iso.charCodeAt(1) - 65);
}

/** Kontrastfarbe für Text auf einer Vereinsfarbe. */
export function readableOn(hex: string): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#101018' : '#FFFFFF';
}
