// Source - https://bost.ocks.org/mike/shuffle/
// Posted by Mike Bostock
// Modified by Homam Mousa to make it typescript compatible and deterministic

import { mulberry32 } from "../deterministic-random";

export function shuffle<T>(array: T[], seed: number) {
  var m = array.length,
    t,
    i;
  const deterministicRandom = mulberry32(seed);

  // While there remain elements to shuffle…
  while (m) {
    // Pick a remaining element…
    i = Math.floor(deterministicRandom() * m--);

    // And swap it with the current element.
    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }

  return array;
}
