// Ghép các khối âm thanh (câu / im lặng / tiếng bíp) thành 1 file WAV mono duy nhất kèm mốc thời gian.
// Phát 1 file liền mạch giúp Android không ngắt khi khóa màn hình.

export const TRACK_SAMPLE_RATE = 22050;

export function silence(seconds) {
  return new Float32Array(Math.round(seconds * TRACK_SAMPLE_RATE));
}

// Chuỗi tiếng bíp để đánh dấu "câu số N" trong bài nghe giả lập (N tiếng bíp).
export function beeps(count, frequency) {
  const beepLength = Math.round(0.18 * TRACK_SAMPLE_RATE);
  const gapLength = Math.round(0.14 * TRACK_SAMPLE_RATE);
  const out = new Float32Array(count * (beepLength + gapLength));
  for (let b = 0; b < count; b++) {
    const offset = b * (beepLength + gapLength);
    for (let i = 0; i < beepLength; i++) {
      const fade = Math.min(1, i / 400, (beepLength - i) / 400);
      out[offset + i] = 0.4 * fade * Math.sin((2 * Math.PI * frequency * i) / TRACK_SAMPLE_RATE);
    }
  }
  return out;
}

// sections: [{ label, blocks: Float32Array[] }] -> { blob, markers: [{ label, time }], duration }
export function buildTrack(sections) {
  const markers = [];
  let total = 0;
  for (const section of sections) {
    markers.push({ label: section.label, time: total / TRACK_SAMPLE_RATE });
    for (const block of section.blocks) total += block.length;
  }
  const pcm = new Float32Array(total);
  let offset = 0;
  for (const section of sections) {
    for (const block of section.blocks) {
      pcm.set(block, offset);
      offset += block.length;
    }
  }
  return { blob: encodeWav(pcm), markers, duration: total / TRACK_SAMPLE_RATE };
}

function encodeWav(pcm) {
  const buffer = new ArrayBuffer(44 + pcm.length * 2);
  const view = new DataView(buffer);
  const writeText = (pos, text) => [...text].forEach((c, i) => view.setUint8(pos + i, c.charCodeAt(0)));
  writeText(0, 'RIFF');
  view.setUint32(4, 36 + pcm.length * 2, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, TRACK_SAMPLE_RATE, true);
  view.setUint32(28, TRACK_SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, 'data');
  view.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}
