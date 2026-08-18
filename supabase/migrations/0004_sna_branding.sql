-- ============================================================================
-- SNA — branding migration
--   1. Adds an `accent_color` to teams (golden-knight accent, default #D4AF37).
--   2. Rebrands the demo team (fixed id from the seed) in place, so existing
--      databases that already ran 0002 get the SNA identity too.
-- Safe to re-run.
-- ============================================================================

alter table public.teams
  add column if not exists accent_color text not null default '#D4AF37';

-- Rebrand the demo team already present in databases that ran 0002_seed.
update public.teams
   set name            = 'SNA Basketball',
       school          = 'SNA Marianapolis International School',
       logo_url        = null,
       primary_color   = '#C8102E',
       secondary_color = '#F2A900',
       accent_color    = '#D4AF37'
 where id = '00000000-0000-4000-8000-000000000001';
