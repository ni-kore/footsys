import { Platform } from 'react-native';

/**
 * Zwei Dinge, die sich nur im Browser abspielen und die React Native Web
 * nicht abdeckt:
 *
 * 1. Der Fokusrahmen. Beim Klicken mit der Maus stört er, bei Bedienung über
 *    die Tastatur ist er unverzichtbar — deshalb bleibt er für `:focus-visible`
 *    erhalten und verschwindet nur für den Mausklick.
 * 2. Weiches Scrollen und Einrasten auf Zeilengrenzen, damit Listen nicht
 *    mitten in einem Namen abgeschnitten stehen bleiben.
 */
const CSS = `
  *:focus { outline: none; }
  *:focus-visible { outline: 2px solid #1FBD4B; outline-offset: 2px; }

  /* Eingabefelder gelten im Browser immer als tastaturbedient und bekämen
     deshalb auch beim Mausklick einen Rahmen. Dort reicht der Cursor. */
  input:focus, input:focus-visible,
  textarea:focus, textarea:focus-visible { outline: none; }

  /* Kein 'overscroll-behavior: contain': sonst bleibt die Seite stehen,
     sobald die Liste am Ende ist und der Zeiger noch darüber steht. */
  [data-snap-list] {
    scroll-behavior: smooth;
    scroll-snap-type: y proximity;
  }
  [data-snap-item] { scroll-snap-align: start; }

  /* Die System-Bildlaufleiste passt nicht zum dunklen Design. Sie bleibt
     sichtbar — sonst weiß niemand, dass es weitergeht — aber schmal und
     in den Farben der App. */
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background: #2C2C35;
    border-radius: 999px;
  }
  ::-webkit-scrollbar-thumb:hover { background: #3D3D48; }
  ::-webkit-scrollbar-corner { background: transparent; }
`;

export function installWebStyles(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('footsys-web-styles')) return;

  const element = document.createElement('style');
  element.id = 'footsys-web-styles';
  element.textContent = CSS;
  document.head.appendChild(element);
}
