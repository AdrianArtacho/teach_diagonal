// Pad roles are independent of the current octave and of the on-screen view.
import {layout} from './music.js';
export const playablePads = layout().filter(p => p.note != null);
export const learnOrder = [...playablePads.filter(p => p.kind === 'white'), ...playablePads.filter(p => p.kind === 'black')];
const ids = new Set(playablePads.map(p => p.id));
const bounded = (v, max, field) => {
  if (!Number.isInteger(v) || v < 0 || v > max) throw new Error(`${field} must be a whole number from 0 to ${max}.`);
  return v;
};
export function normalizeMapping(mapping, complete = false) {
  if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) throw new Error('A pad mapping must be an object.');
  const result = {}, inputs = new Set(), outputs = new Set();
  for (const [id, v] of Object.entries(mapping)) {
    if (!ids.has(id) || !v || typeof v !== 'object') throw new Error(`Unknown or invalid playable pad: ${id}.`);
    const note = bounded(v.note, 127, 'MIDI note'), channel = bounded(v.channel, 15, 'MIDI channel (zero-based in JSON)');
    const ledNote = bounded(v.ledNote ?? note, 127, 'LED note');
    // Migrate v1 mappings: lighting previously always used channel 1.
    const ledChannel = bounded(v.ledChannel ?? 0, 15, 'LED channel (zero-based in JSON)');
    const input = `${channel}:${note}`, output = `${ledChannel}:${ledNote}`;
    if (inputs.has(input)) throw new Error(`Two pads use input note ${note} on channel ${channel + 1}.`);
    if (outputs.has(output)) throw new Error(`Two pads use LED note ${ledNote} on channel ${ledChannel + 1}.`);
    inputs.add(input); outputs.add(output); result[id] = {note, channel, ledNote, ledChannel};
  }
  if (complete && Object.keys(result).length !== 13) throw new Error('Assign all 13 playable pads before applying or exporting.');
  return result;
}
export function importMapping(text) {
  if (text.length > 65536) throw new Error('Mapping files must be smaller than 64 KB.');
  let data; try {data = JSON.parse(text);} catch {throw new Error('This is not a valid JSON mapping file.');}
  if (data?.format && data.format !== 'diamond-pad-map') throw new Error('This file is not a Diamond pad map.');
  if (data?.version != null && ![1, 2].includes(data.version)) throw new Error('This mapping version is not supported.');
  return normalizeMapping(data?.mapping ?? data?.custom ?? data, true);
}
export function exportMapping(mapping) {
  return JSON.stringify({format: 'diamond-pad-map', version: 2, mapping: normalizeMapping(mapping, true)}, null, 2) + '\n';
}
