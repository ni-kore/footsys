# Ausrüster

Hier liegen die Logos der Ausrüster als PNG mit durchsichtigem Hintergrund.

Nach jedem Upload einmal laufen lassen:

    node scripts/generate-partners.js

Das Skript trägt neue Dateien in `data/game/partners.json` ein und erzeugt die
Bundler-Einbindung `apps/mobile/src/partner-logos.ts`. Der Dateiname wird zum
Namen: `nike.png` wird zu "Nike", `under-armour.png` zu "Under Armour".

Die Reichweite eines neuen Ausrüsters steht danach auf 4 und lässt sich in
`data/game/partners.json` von Hand anheben. Sie bestimmt, wie viele Fans der
Vertrag bringt und wie stark er bessere Vereinsangebote anzieht.
