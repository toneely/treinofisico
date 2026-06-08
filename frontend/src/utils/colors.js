export const getContrastColor = (hexcolor) => {
  if (!hexcolor) return '#000000';
  const r = parseInt(hexcolor.slice(1, 3), 16);
  const g = parseInt(hexcolor.slice(3, 5), 16);
  const b = parseInt(hexcolor.slice(5, 7), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#111827' : '#FFFFFF';
};

export const getSafeColor = (color, background) => {
  // Simple darkening/lightening logic for contrast
  // If base color is too close to background brightness, shift it.
  const getBrightness = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return ((r * 299) + (g * 587) + (b * 114)) / 1000;
  };

  const cB = getBrightness(color);
  const bB = getBrightness(background);
  const diff = Math.abs(cB - bB);

  if (diff < 60) {
    // If background is dark, lighten the color. If light, darken it.
    return (bB < 128) ? lightenColor(color, 40) : darkenColor(color, 40);
  }

  return color;
};

const lightenColor = (col, amt) => {
  let usePound = false;
  if (col[0] == "#") {
    col = col.slice(1);
    usePound = true;
  }
  let num = parseInt(col, 16);
  let r = (num >> 16) + amt;
  if (r > 255) r = 255;
  else if (r < 0) r = 0;
  let b = ((num >> 8) & 0x00FF) + amt;
  if (b > 255) b = 255;
  else if (b < 0) b = 0;
  let g = (num & 0x0000FF) + amt;
  if (g > 255) g = 255;
  else if (g < 0) g = 0;
  return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
};

const darkenColor = (col, amt) => lightenColor(col, -amt);
