// Source - https://stackoverflow.com/a/47593316
// Posted by bryc, modified by community. See post 'Timeline' for change history
// Retrieved 2026-11-13, License - CC BY-SA 4.0

export function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
