// Trang thử nghiệm: phát 1 file WAV dựng sẵn, nhận nút tai nghe / Bluetooth xe qua Media Session, ghi nhật ký.
import { buildTrack, beeps, silence, TRACK_SAMPLE_RATE } from './wav-track-builder.js';
import { findPauses } from './silence-segmenter.js';
import { log, clearLog, watchLog, logText } from './event-log.js';

const $ = (id) => document.getElementById(id);
const audio = $('audio');
let track = null;
let trackUrl = null;
let currentIndex = -1;
let lastTimeUpdateAt = 0;

// ---------- Dựng bài ----------

function buildSyntheticTrack() {
  const sections = [];
  for (let n = 1; n <= 10; n++) {
    sections.push({ label: `Câu ${n}`, blocks: [beeps(n, 880), silence(3)] });
  }
  return buildTrack(sections);
}

async function buildTrackFromMp3(file, minPauseSeconds, mode) {
  const context = new AudioContext({ sampleRate: TRACK_SAMPLE_RATE });
  const decoded = await context.decodeAudioData(await file.arrayBuffer());
  context.close();
  const mono = new Float32Array(decoded.length);
  for (let c = 0; c < decoded.numberOfChannels; c++) {
    const data = decoded.getChannelData(c);
    for (let i = 0; i < mono.length; i++) mono[i] += data[i] / decoded.numberOfChannels;
  }
  const rate = decoded.sampleRate;
  const boundaries = findPauses(mono, rate).filter((p) => p.duration >= minPauseSeconds);
  const cuts = [0, ...boundaries.map((p) => (p.start + p.end) / 2), mono.length / rate];
  const sections = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const clip = mono.slice(Math.floor(cuts[i] * rate), Math.floor(cuts[i + 1] * rate));
    const clipSeconds = clip.length / rate;
    const blocks = mode === 'repeat'
      ? [clip, silence(Math.max(1.5, 1.3 * clipSeconds)), clip, silence(0.8)]
      : [clip];
    sections.push({ label: `Câu ${i + 1}`, blocks });
  }
  log(`Nạp MP3: ${(mono.length / rate).toFixed(1)}s, ${boundaries.length} khoảng nghỉ ≥ ${minPauseSeconds}s → ${sections.length} câu`);
  return buildTrack(sections);
}

function loadTrack(newTrack, name) {
  if (trackUrl) URL.revokeObjectURL(trackUrl);
  track = newTrack;
  trackUrl = URL.createObjectURL(track.blob);
  audio.src = trackUrl;
  applySpeed();
  currentIndex = -1;
  $('track-info').textContent = `${name} · ${track.markers.length} câu · ${Math.round(track.duration)}s · ${(track.blob.size / 1e6).toFixed(1)} MB`;
  $('player').hidden = false;
  log(`Đã dựng bài "${name}" (${track.markers.length} câu)`);
}

// ---------- Điều hướng theo mốc câu ----------

function indexAt(time) {
  let index = 0;
  track.markers.forEach((m, i) => { if (m.time <= time + 0.05) index = i; });
  return index;
}

function seekTo(index, reason) {
  const clamped = Math.max(0, Math.min(track.markers.length - 1, index));
  audio.currentTime = track.markers[clamped].time;
  log(`${reason} → ${track.markers[clamped].label}`);
  if (audio.paused) audio.play();
}

function nextSentence(reason) {
  seekTo(indexAt(audio.currentTime) + 1, reason);
}

// "Câu trước" = nghe lại câu đang phát; nếu vừa bắt đầu câu (< 1,5s) thì lùi hẳn về câu trước.
function previousSentence(reason) {
  const index = indexAt(audio.currentTime);
  const intoSentence = audio.currentTime - track.markers[index].time;
  seekTo(intoSentence > 1.5 ? index : index - 1, reason);
}

function updateNowPlaying() {
  const index = indexAt(audio.currentTime);
  if (index === currentIndex) return;
  currentIndex = index;
  const label = `${track.markers[index].label}/${track.markers.length}`;
  $('now').textContent = label;
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({ title: label, artist: 'Học thuộc kịch bản', album: 'Thử nghiệm' });
  }
}

// ---------- Media Session (nút tai nghe / xe / màn hình khóa) ----------

function setupMediaSession() {
  if (!('mediaSession' in navigator)) {
    log('⚠ Trình duyệt KHÔNG hỗ trợ Media Session');
    return;
  }
  const handlers = {
    play: () => { log('NÚT: play'); audio.play(); },
    pause: () => { log('NÚT: pause'); audio.pause(); },
    stop: () => { log('NÚT: stop'); audio.pause(); },
    nexttrack: () => nextSentence('NÚT: nexttrack'),
    previoustrack: () => previousSentence('NÚT: previoustrack'),
    seekforward: () => { log('NÚT: seekforward'); audio.currentTime += 10; },
    seekbackward: () => { log('NÚT: seekbackward'); audio.currentTime -= 10; },
  };
  for (const [action, handler] of Object.entries(handlers)) {
    try { navigator.mediaSession.setActionHandler(action, handler); }
    catch { log(`⚠ Không đăng ký được nút "${action}"`); }
  }
}

// ---------- Tốc độ ----------

function applySpeed() {
  const rate = Number($('speed').value);
  audio.preservesPitch = true;
  audio.defaultPlaybackRate = rate;
  audio.playbackRate = rate;
}

// ---------- Theo dõi phát nền ----------

audio.addEventListener('play', () => log(`▶ phát${document.hidden ? ' (màn hình ẩn)' : ''}`));
audio.addEventListener('pause', () => log(`⏸ dừng${document.hidden ? ' (màn hình ẩn)' : ''}`));
audio.addEventListener('ended', () => log('■ hết bài'));
audio.addEventListener('error', () => log(`⚠ lỗi phát: ${audio.error?.message || audio.error?.code}`));
audio.addEventListener('timeupdate', () => {
  const now = Date.now();
  if (!audio.paused && lastTimeUpdateAt && now - lastTimeUpdateAt > 5000) {
    log(`⚠ mất tiếng/khựng ${Math.round((now - lastTimeUpdateAt) / 1000)}s`);
  }
  lastTimeUpdateAt = now;
  updateNowPlaying();
  if ('mediaSession' in navigator && audio.duration) {
    try { navigator.mediaSession.setPositionState({ duration: audio.duration, position: audio.currentTime, playbackRate: audio.playbackRate }); } catch {}
  }
});
audio.addEventListener('pause', () => { lastTimeUpdateAt = 0; });
document.addEventListener('visibilitychange', () => log(document.hidden ? '🔒 màn hình ẩn/khóa' : '🔓 màn hình mở lại'));

// ---------- Giao diện ----------

$('build-synthetic').addEventListener('click', () => loadTrack(buildSyntheticTrack(), 'Bài bíp giả lập'));
$('build-mp3').addEventListener('click', async () => {
  const file = $('mp3-file').files[0];
  if (!file) { alert('Chọn file MP3 trước'); return; }
  $('build-mp3').disabled = true;
  try {
    loadTrack(await buildTrackFromMp3(file, Number($('min-pause').value), $('mode').value), file.name);
  } catch (error) {
    log(`⚠ lỗi đọc MP3: ${error.message}`);
  } finally {
    $('build-mp3').disabled = false;
  }
});
$('play').addEventListener('click', () => (audio.paused ? audio.play() : audio.pause()));
$('prev').addEventListener('click', () => previousSentence('Màn hình: câu trước'));
$('next').addEventListener('click', () => nextSentence('Màn hình: câu sau'));
$('speed').addEventListener('change', () => { applySpeed(); log(`Tốc độ ${audio.playbackRate}×`); });
$('loop').addEventListener('change', () => { audio.loop = $('loop').checked; });
audio.addEventListener('play', () => { $('play').textContent = 'Dừng'; });
audio.addEventListener('pause', () => { $('play').textContent = 'Phát'; });
$('copy-log').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(logText()); alert('Đã chép nhật ký'); }
  catch { alert('Không chép được, hãy chụp màn hình'); }
});
$('clear-log').addEventListener('click', clearLog);
watchLog((entries) => { $('log').textContent = entries.join('\n') || '(chưa có sự kiện)'; });

audio.loop = $('loop').checked;
setupMediaSession();
log(`Mở trang · ${navigator.userAgent.match(/Android [\d.]+|iPhone OS [\d_]+|Windows NT [\d.]+/)?.[0] || 'thiết bị lạ'}`);
