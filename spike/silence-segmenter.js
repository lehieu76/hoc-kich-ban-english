// Tìm các khoảng lặng trong âm thanh mono (Float32Array) để cắt câu.
// Dùng chung cho trang thử nghiệm (trình duyệt) và script đo trên máy (Node).

const FRAME_SECONDS = 0.02;
const MIN_PAUSE_SECONDS = 0.15;

// Trả về danh sách khoảng lặng nằm giữa phần có tiếng: [{ start, end, duration }] (giây).
export function findPauses(samples, sampleRate) {
  const frameSize = Math.round(sampleRate * FRAME_SECONDS);
  const frameCount = Math.floor(samples.length / frameSize);
  const rms = new Float32Array(frameCount);
  let peak = 0;
  for (let f = 0; f < frameCount; f++) {
    let sum = 0;
    for (let i = f * frameSize; i < (f + 1) * frameSize; i++) sum += samples[i] * samples[i];
    rms[f] = Math.sqrt(sum / frameSize);
    if (rms[f] > peak) peak = rms[f];
  }
  const threshold = peak * 0.03; // khoảng -30 dB so với đỉnh

  const pauses = [];
  let runStart = -1;
  let seenSound = false;
  for (let f = 0; f <= frameCount; f++) {
    const silent = f < frameCount && rms[f] < threshold;
    if (silent && runStart < 0) runStart = f;
    if (!silent) {
      if (runStart >= 0 && seenSound && f < frameCount) {
        const duration = (f - runStart) * FRAME_SECONDS;
        if (duration >= MIN_PAUSE_SECONDS) {
          pauses.push({ start: runStart * FRAME_SECONDS, end: f * FRAME_SECONDS, duration });
        }
      }
      runStart = -1;
      if (f < frameCount) seenSound = true;
    }
  }
  return pauses;
}

// Chọn (sentenceCount - 1) khoảng lặng dài nhất làm ranh giới câu, trả về mốc giữa mỗi khoảng lặng theo thứ tự thời gian.
export function pickSentenceBoundaries(pauses, sentenceCount) {
  return [...pauses]
    .sort((a, b) => b.duration - a.duration)
    .slice(0, Math.max(0, sentenceCount - 1))
    .sort((a, b) => a.start - b.start);
}
