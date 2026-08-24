# footsys

A football career simulator. You create a player from a handful of inputs
(name, number, foot, nationality, position) and follow their career from age 16
to retirement. Every summer a club comes calling, and alongside it life brings
whatever it brings — sometimes nothing, sometimes a couple of decisions that
change the path.

Target platform: iOS. Developed on Windows, no Mac required.

The interface is available in **English, German and Spanish**, switchable at any
time from the top-right of the screen. Everything is translated: the interface,
the career prose, every event, the outcomes, and the names of countries,
positions and competitions. Club, league and cup names keep their real name in
every language.

## Quick start

You need Node 20 or newer (developed on Node 24) and npm.

```bash
npm install
npm --prefix apps/mobile install
npm run app
```

`npm run app` starts Metro and opens the app at <http://localhost:8081> in the
browser. The terminal also shows a QR code: scan it with **Expo Go** (App Store)
to run the same app on an iPhone or iPad — the computer and the device must be
on the same Wi-Fi.

If Metro gets stuck after a code or data change, start it without its cache:

```bash
npm run app:clear
```

For a real distributable `.ipa` later, `eas build --platform ios` runs on
Apple's cloud machines and only needs an Apple developer account.

## Commands

```bash
npm test                # engine tests, including the determinism proof
npm run typecheck       # engine
npm run typecheck:app   # app
npm run sim -- --runs 300 --position ST --country GER --verbose
npm run balance -- 120  # careers against the target table in docs/iteration-2.md
npm run assets          # reports which badges and trophies are still missing
npm run import:clubs    # one-off data import, see data/football/README.md
```

`npm run sim` and `npm run balance` play hundreds of careers with random choices
and print the distribution — the tool for balancing. `npm run balance` checks
against the second iteration's target values (peak OVR, titles, followers).

## Layout

```
data/                      Stack-neutral game data (plain JSON)
  core/
    confederations.json    6 confederations
    countries.json         210 FIFA nations, names in de / en / es
    positions.json         17 positions with pitch coordinates, localized
    formations.json        22 formations with slot assignments
    association-logos.json country -> association crest in assets/nations
    fifa-ranking.json       world ranking as the starting strength of nations
  football/
    leagues.json           78 leagues under their real names (country, tier, cup)
    cups.json              81 national cup competitions
    competitions.json      24 club, 9 national and 10 individual awards (localized)
    clubs/<FIFA>.json      1,219 clubs across 55 countries, grouped by league
  game/
    progression.json       development, roles, market value, followers, interest
    team-season.json       league position, titles, European entry
    events.json            64 career decisions and 10 structural, all de/en/es
    random-events.json     22 events without a decision, all de/en/es
    meters.json            morale, fan support, press, with their effect curves
    partners.json          98 media partners, 3 kit suppliers, offer rules
    trophy-odds.json       title probabilities by reputation
design/
  DESIGN.md                design language and responsive behaviour (iPhone/iPad)
  tokens.json              colors, spacing, radii, typography, components
docs/
  iteration-2.md           plan of the second iteration and its open points
assets/                    image files, filed by name, see assets/README.md
  clubs/                   <club-id>.png
  trophies/                trophy images (see below)
  _fallback/trophies/      the six hand-made trophy silhouettes used for now
  nations/                 association crests
  mediapartner/            broadcaster and publisher logos
  ui/                      kofi button image
  events/                  images for the answers of the decision cards
apps/mobile/               Expo app (iPhone, iPad, web)
  App.tsx                  state machine start -> career -> retirement
  src/i18n.tsx             language provider, useLocale / useT hooks
  src/strings.ts           every interface string in de / en / es
  src/theme.ts             tokens from design/tokens.json
  src/game-data.ts         bundled game data, one copy per career
  src/format.ts            money, followers, roles and the quiet-season summary
  src/story.ts             the localized career opening
  src/trophy-art.ts        maps a title to its trophy silhouette
  src/components/
    ui.tsx                 cards, meters, badges, brand header, language selector
    PlayerCard.tsx         the player card: values, club, trophies, partners, meters
    CareerLayout.tsx       two equal-height panels side by side
    SeasonTable.tsx        season by season, totals, national team
    Tooltip.tsx            one hint layer above the whole app
    Trophy.tsx             a won title as a shape, with count and hover hint
    CardImage.tsx          the angled image on the answers
    motion.tsx             counting, fading, transitions
  src/screens/             identity, career start, decision, kickoff, report, end
packages/engine/src/       game logic (purely functional, deterministic by seed)
  types.ts                 types for every data file and the save state
  i18n.ts                  Locale type and the tr() resolver
  rng.ts                   deterministic random generator
  data.ts / data-node.ts   data access (injected or from the file system)
  progression.ts           development, potential, squad role, market value
  simulation.ts            play a half-season, close a season
  team-season.ts           the team's league position, and from it titles and Europe
  meters.ts                morale, support and press as amplifiers
  facts.ts                 career facts that trigger events
  events.ts                event selection, club offers, modifiers, localization
  outcome.ts               what a choice means, in words rather than numbers
  partners.ts / fans.ts    media partners, kit suppliers, reach
  national-team.ts         call-ups, internationals, tournaments
  career.ts                the career flow
  tools/                   simulate, balance, assets, import-clubs, check-nations
scripts/                   one-off import and mapping runs (Node, no build)
```

## Stack

TypeScript, app as Expo / React Native. Development runs on Windows; the iOS
build is produced through EAS on Apple's cloud machines, so a Mac is not needed.
The engine is deliberately free of UI and platform APIs — if the project ever
moves to native SwiftUI, only the engine is ported.

## Internationalisation

The engine stores every player-facing text in all three languages at once, so
switching language updates the current screen instantly, including the decision
you are looking at and its outcome. The app resolves data through `tr(value,
locale)` and interface strings through `useT()`; the chosen language is
remembered between sessions. Untranslated text falls back to English, then
German, so nothing is ever blank. Proper nouns — clubs, leagues, cups, the
player's name — are the same in every language.

## Flow

The engine stops wherever the chosen rhythm calls for it. Each intermediate
state gets its own screen and only moves on when you act:

    Identity -> Club choice -> Kickoff -> Decisions -> Half-season report
             -> Decisions -> Season report -> ... -> Retirement

- The smallest simulated unit is the **half-season**; the two halves are played
  and reported separately
- Each **summer** a club enquires — stay or go is the question a career turns
  on. Only when nobody currently has you on their list does the phone stay quiet
- On top of that come **zero to two further decisions** as a card deck: swipe it
  left and right, and every choice can still be changed until kickoff. At most
  one club question stands in a break — you do not pick a club twice in a row
- Offers come from **your own division and region**: usually the same or a
  neighbouring league, overwhelmingly the same continent. A career works its way
  up from the bottom, and whoever slips gets the calls from further down
- After each half-season, **random events** also occur: a new coach, a hot
  streak, an injury, relegation, an investor, a red card
- If an event forces a move, you choose the destination yourself
- The **season kickoff** is only shown before the very first season

## How a season is decided

It is not the player who wins the title, but the team. `team-season.ts` first
rolls the league position from the club's reputation, then shifts it by the
player's contribution — noticeable, but never far enough that a promoted side
with a strong striker becomes champion. The position yields the titles and the
club's European entry for the following season. So to win something you have to
move to where something is there to win.

Around that:

- **Meters as amplifiers.** Morale, support and press bend appearances, output,
  variance and awards through curves in `meters.json`
- **Environment.** A bigger club makes the player better in their own right
- **Facts and chains.** What has happened in a career triggers fitting events
  later; some decisions come back seasons afterwards
- **Market interest.** Form and headlines determine how many and how good the
  summer offers are
- **Partners.** Media partners and kit suppliers bring followers and better
  offers, none of it guaranteed
- **Followers.** The cap is 400 million normally; only PELLE PELLE reaches 700

## Trophies

The `assets/trophies` folder holds thousands of images named by opaque numeric
ids from another source, with no reliable way to map them to competitions.
Rather than guess — a wrongly labelled trophy is worse than an honest generic
one — each title resolves to a type-appropriate silhouette from
`assets/_fallback/trophies`: a shield for a league, a cup for a domestic cup,
the continental trophy, the world trophy, a boot or a ball for individual
awards. Hovering a trophy names the exact title. When real images are mapped,
they replace the silhouettes in `trophy-art.ts`.

## Hidden potential

Every player starts with a performance ceiling that is never shown. The closer
the current OVR is to it, the more it slows growth. Without this every player in
a game like this becomes world class. Over 120 played-out careers the peak OVR
sits at a median of 74; a tenth never pass 67 and a tenth go beyond 86. A fifth
of all careers end without a single title.

## Principles

1. **Data is data.** No balancing in code, all of it in `data/`. Adding a league
   or tweaking a curve touches no code.
2. **Deterministic.** Same seed + same choices = same career. No `Math.random()`
   in the engine, only a seeded RNG whose state is part of the save. That makes
   replays, sharing and tests possible.
3. **No network at runtime.** All data and images live in the project. Imports
   run once through `scripts/` and `tools/`, never while playing.
4. **The engine is portable.** It knows no UI and no framework. If the project
   ever moves to native Swift, only the engine is ported — the data is unchanged.
5. **i18n from the start.** Every visible text goes through keys, data carries
   `de` / `en` / `es` fields.

## Data status

- Confederations, countries, positions, formations: complete, all trilingual
- Leagues and cups: the relevant competitions of every confederation, under
  their real names
- Clubs: 1,219 across 55 countries; only clubs with a badge are selectable
- Kit suppliers are fixed for 96 top clubs; their logos are not in yet
- Trophy images are not mapped yet: every title shows its silhouette, and the
  hover hint names it
- Of 246 association crests, 50 are mapped to a country
- Country codes and assignments follow the FIFA standard but are not yet
  validated against an official source

Open points of the current iteration are in `docs/iteration-2.md`.
