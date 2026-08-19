/** SVG-Dateien werden über react-native-svg-transformer zu Komponenten. */
declare module '*.svg' {
  import type React from 'react';
  import type { SvgProps } from 'react-native-svg';

  const content: React.FC<SvgProps>;
  export default content;
}

/** Rasterbilder werden vom Bundler zu einer Quellen-Kennung. */
declare module '*.png' {
  const content: number;
  export default content;
}
