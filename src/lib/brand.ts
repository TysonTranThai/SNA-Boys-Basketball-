import snaLogoUrl from '@/assets/logo.png'

/**
 * SNA — the single source of truth for the platform's brand identity.
 *
 * Every visible brand name, tagline, color and asset flows from this object.
 * The captain's team row (teams table) can still override the dynamic accent
 * colors at runtime, but the static SNA identity (login, chrome, titles,
 * fallbacks) is always derived from here.
 */

export interface SnaBrand {
  /** Short brand name used everywhere ("SNA"). */
  name: string
  /** Full descriptor / tagline. */
  tagline: string
  /** Default sport for the SNA varsity team. */
  sport: string
  /** Default season/year. */
  season: string
  /** Wordmark asset (bundler-safe path — transparent background). */
  logo: string
  colors: {
    /** SNA red — primary action color. */
    primary: string
    /** SNA yellow/gold — secondary color. */
    secondary: string
    /** Golden knight — accent for highlights, wins, captain marks. */
    accent: string
  }
  theme: {
    appearance: 'dark' | 'light' | 'system'
    style: string
    density: 'compact' | 'comfortable' | 'spacious'
    animations: 'none' | 'subtle' | 'dynamic'
  }
}

export const snaBrand: SnaBrand = {
  name: 'SNA Boys',
  tagline: 'SNA Boys Basketball — Varsity Team Platform',
  sport: 'Basketball',
  season: '2026–2027',
  logo: snaLogoUrl,
  colors: {
    primary: '#C8102E', // SNA red
    secondary: '#F2A900', // SNA gold
    accent: '#D4AF37', // golden knight
  },
  theme: {
    appearance: 'dark',
    style: 'modern sports',
    density: 'comfortable',
    animations: 'subtle',
  },
}

/** "SNA Boys · Dashboard", "SNA Boys · Attendance", … — or just "SNA Boys". */
export function pageTitle(segment?: string): string {
  return segment ? `${snaBrand.name} · ${segment}` : snaBrand.name
}

/** Set the browser tab title to the SNA-branded form. */
export function setSnaTitle(segment?: string): void {
  document.title = pageTitle(segment)
}
