/**
 * Flagship pool — senior women's stars for the demo.
 *
 * Why pros (not the U17 set) for the demo: real faces are usable (public
 * figures, not minors), the names are already recognizable, and there's more to
 * show. Photos are pulled live from Wikipedia by `wiki` title (public images
 * standing in for official FIFA assets). Nation-diverse on purpose — including
 * smaller nations — to fit the "grow the global women's game" story.
 *
 * NOTE: the stat values here are ILLUSTRATIVE (plausible tournament outputs) so
 * the visuals work end-to-end. Production wires the real FIFA numbers; swap the
 * stats here for the live figures before anything goes public.
 */
import type { PlayerRecord } from './resolver';
import { PLAYER_FACTS } from './playerFacts';

export interface FlagshipPlayer extends PlayerRecord {
  wiki: string;   // Wikipedia article title for the portrait pull
}

function fp(
  id: number, name: string, team: string, club: string, position: string, shirt: number, age: number, wiki: string,
  s: { line_breaks: number; goals: number; shots: number; passes: number; passes_complete: number; pressings: number; ball_progressions: number },
): FlagshipPlayer {
  PLAYER_FACTS[name.trim().toLowerCase()] = { age, club, from: team };
  return { player_id: id, player_name: name, team, shirt_number: shirt, position, wiki, ...s };
}

export const FLAGSHIP_PLAYERS: FlagshipPlayer[] = [
  fp(101, 'Aitana Bonmatí',        'SPAIN',     'Barcelona',         'Center Midfield', 6,  28, 'Aitana Bonmatí',        { line_breaks: 112, goals: 5, shots: 21, passes: 618, passes_complete: 548, pressings: 96,  ball_progressions: 104 }),
  fp(102, 'Alexia Putellas',       'SPAIN',     'Barcelona',         'Center Midfield', 11, 32, 'Alexia Putellas',       { line_breaks: 98,  goals: 6, shots: 27, passes: 574, passes_complete: 501, pressings: 82,  ball_progressions: 92 }),
  fp(103, 'Salma Paralluelo',      'SPAIN',     'Barcelona',         'Forward',         18, 22, 'Salma Paralluelo',      { line_breaks: 61,  goals: 7, shots: 33, passes: 288, passes_complete: 231, pressings: 74,  ball_progressions: 88 }),
  fp(104, 'Sam Kerr',              'AUSTRALIA', 'Chelsea',           'Forward',         20, 33, 'Sam Kerr',              { line_breaks: 44,  goals: 9, shots: 41, passes: 246, passes_complete: 190, pressings: 68,  ball_progressions: 71 }),
  fp(105, 'Lauren James',          'ENGLAND',   'Chelsea',           'Forward',         7,  25, 'Lauren James (footballer)', { line_breaks: 73, goals: 6, shots: 29, passes: 341, passes_complete: 279, pressings: 70, ball_progressions: 95 }),
  fp(106, 'Alessia Russo',         'ENGLAND',   'Arsenal',           'Forward',         23, 27, 'Alessia Russo',         { line_breaks: 39,  goals: 8, shots: 36, passes: 214, passes_complete: 168, pressings: 79,  ball_progressions: 58 }),
  fp(107, 'Mary Earps',            'ENGLAND',   'Paris Saint-Germain','Goalkeeper',     1,  33, 'Mary Earps',            { line_breaks: 8,   goals: 0, shots: 0,  passes: 192, passes_complete: 151, pressings: 6,   ball_progressions: 12 }),
  fp(108, 'Sophia Smith',          'USA',       'Portland Thorns',   'Forward',         11, 25, 'Sophia Smith (soccer, born 2000)', { line_breaks: 55,  goals: 8, shots: 38, passes: 262, passes_complete: 205, pressings: 84,  ball_progressions: 90 }),
  fp(109, 'Trinity Rodman',        'USA',       'Washington Spirit', 'Forward',         20, 24, 'Trinity Rodman',        { line_breaks: 66,  goals: 5, shots: 31, passes: 298, passes_complete: 238, pressings: 88,  ball_progressions: 97 }),
  fp(110, 'Naomi Girma',           'USA',       'San Diego Wave',    'Center Back',     4,  26, 'Naomi Girma',           { line_breaks: 91,  goals: 0, shots: 3,  passes: 662, passes_complete: 611, pressings: 118, ball_progressions: 47 }),
  fp(111, 'Marta',                 'BRAZIL',    'Orlando Pride',     'Forward',         10, 39, 'Marta (footballer)',    { line_breaks: 70,  goals: 6, shots: 30, passes: 312, passes_complete: 251, pressings: 62,  ball_progressions: 84 }),
  fp(112, 'Ada Hegerberg',         'NORWAY',    'Lyon',              'Forward',         14, 30, 'Ada Hegerberg',         { line_breaks: 41,  goals: 7, shots: 34, passes: 233, passes_complete: 182, pressings: 66,  ball_progressions: 61 }),
  fp(113, 'Caroline Graham Hansen','NORWAY',    'Barcelona',         'Right Wing',      10, 31, 'Caroline Graham Hansen',{ line_breaks: 68,  goals: 5, shots: 28, passes: 356, passes_complete: 292, pressings: 72,  ball_progressions: 101 }),
  fp(114, 'Barbra Banda',          'ZAMBIA',    'Orlando Pride',     'Forward',         11, 25, 'Barbra Banda',          { line_breaks: 47,  goals: 9, shots: 39, passes: 208, passes_complete: 159, pressings: 71,  ball_progressions: 75 }),
  fp(115, 'Khadija Shaw',          'JAMAICA',   'Manchester City',   'Forward',         11, 29, 'Khadija Shaw',          { line_breaks: 52,  goals: 8, shots: 37, passes: 241, passes_complete: 187, pressings: 64,  ball_progressions: 69 }),
  fp(116, 'Hinata Miyazawa',       'JAPAN',     'Manchester United', 'Attacking Mid',   7,  26, 'Hinata Miyazawa',       { line_breaks: 64,  goals: 5, shots: 26, passes: 327, passes_complete: 271, pressings: 90,  ball_progressions: 86 }),
  fp(117, 'Wendie Renard',         'FRANCE',    'Lyon',              'Center Back',     3,  35, 'Wendie Renard',         { line_breaks: 83,  goals: 3, shots: 12, passes: 598, passes_complete: 542, pressings: 104, ball_progressions: 44 }),
  fp(118, 'Fridolina Rolfö',       'SWEDEN',    'Barcelona',         'Left Back',       8,  32, 'Fridolina Rolfö',       { line_breaks: 76,  goals: 4, shots: 22, passes: 447, passes_complete: 379, pressings: 86,  ball_progressions: 93 }),
];
