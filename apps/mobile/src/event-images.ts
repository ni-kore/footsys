/**
 * Bilder für die Antwortmöglichkeiten.
 *
 * Metro bündelt Bilder nur über statische require-Aufrufe, deshalb steht hier
 * für jedes Motiv ein Eintrag. Motive ohne Bild fehlen bewusst: die Antwort
 * kommt dann ohne aus, statt eine unpassende Aufnahme zu zeigen.
 *
 * Neue Bilder kommen nach `assets/events/` und werden hier eingetragen, die
 * Nachweise stehen in `assets/events/CREDITS.md`.
 */

export const eventImages: Record<string, number> = {
  training: require('../../../assets/events/training.jpg'),
  gym: require('../../../assets/events/gym.jpg'),
  hospital: require('../../../assets/events/hospital.jpg'),
  media: require('../../../assets/events/media.jpg'),
  travel: require('../../../assets/events/travel.jpg'),
  contract: require('../../../assets/events/contract.jpg'),
  transfer: require('../../../assets/events/transfer.jpg'),
  dressing_room: require('../../../assets/events/dressing_room.jpg'),
  ball: require('../../../assets/events/ball.jpg'),
};
