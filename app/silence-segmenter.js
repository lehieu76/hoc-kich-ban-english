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

// Khớp câu với khoảng lặng bằng quy hoạch động: câu dài thì đọc lâu, nên chọn bộ ranh giới
// sao cho tốc độ đọc (ký tự/giây) của các câu đều nhau nhất, ưu tiên khoảng lặng dài.
// Chịu được trường hợp ngắt hơi trong câu dài gần bằng khoảng nghỉ giữa câu.
// sentenceLengths: số ký tự từng câu. Trả về (N-1) khoảng lặng được chọn làm ranh giới.
export function alignSentencesToPauses(pauses, sentenceLengths, totalSeconds) {
  const n = sentenceLengths.length;
  const p = pauses.length;
  if (n <= 1) return [];
  if (p < n - 1) return pickSentenceBoundaries(pauses, n);
  const totalChars = sentenceLengths.reduce((a, b) => a + b, 0);
  const totalPause = pauses.reduce((a, q) => a + q.duration, 0);
  const secondsPerChar = (totalSeconds - totalPause * 0.5) / totalChars;
  const PAUSE_WEIGHT = 0.6;

  // Độ lệch của câu i nếu kéo dài từ điểm start đến điểm end (giây), tính theo log tỉ lệ.
  const spanCost = (i, start, end) => {
    const expected = 0.25 + sentenceLengths[i] * secondsPerChar;
    const ratio = Math.max(end - start, 0.05) / expected;
    return Math.log(ratio) ** 2;
  };
  const pauseBonus = (q) => PAUSE_WEIGHT * Math.log(q.duration / 0.3);
  const startOf = (k) => (k < 0 ? 0 : pauses[k].end);

  // best[i][k]: chi phí nhỏ nhất khi câu i kết thúc tại khoảng lặng k.
  const best = Array.from({ length: n - 1 }, () => new Float64Array(p).fill(Infinity));
  const from = Array.from({ length: n - 1 }, () => new Int32Array(p).fill(-1));
  for (let k = 0; k < p; k++) best[0][k] = spanCost(0, 0, pauses[k].start) - pauseBonus(pauses[k]);
  for (let i = 1; i < n - 1; i++) {
    for (let k = i; k < p; k++) {
      for (let j = i - 1; j < k; j++) {
        if (best[i - 1][j] === Infinity) continue;
        const cost = best[i - 1][j] + spanCost(i, startOf(j), pauses[k].start) - pauseBonus(pauses[k]);
        if (cost < best[i][k]) { best[i][k] = cost; from[i][k] = j; }
      }
    }
  }
  let end = -1;
  let bestTotal = Infinity;
  for (let k = n - 2; k < p; k++) {
    const total = best[n - 2][k] + spanCost(n - 1, startOf(k), totalSeconds);
    if (total < bestTotal) { bestTotal = total; end = k; }
  }
  const chosen = [];
  for (let i = n - 2, k = end; i >= 0; k = from[i][k], i--) chosen.unshift(pauses[k]);
  return chosen;
}
