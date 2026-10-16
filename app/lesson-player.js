// Trình phát học theo đoạn: chữ to + Phát/Dừng + Đoạn trước/sau.
// Điều khiển được từ màn hình khóa / tai nghe / Bluetooth xe qua Media Session.
import { parseTimestampScript, snapParagraphsToPauses } from './timestamp-script-parser.js';
import { findPauses } from './silence-segmenter.js';
import { saveLesson, loadLesson } from './lesson-storage.js';

const $ = (id) => document.getElementById(id);
const audio = $('audio');
const POSITION_KEY = 'lesson-position';
const SPEED_KEY = 'lesson-speed';
const RESTART_THRESHOLD_SECONDS = 2;

let lesson = null;
let currentIndex = -1;
let audioUrl = null;

// ---------- Nạp bài ----------

async function decodePauses(file) {
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await file.arrayBuffer());
    return findPauses(decoded.getChannelData(0), decoded.sampleRate);
  } finally {
    context.close();
  }
}

async function importLesson() {
  const mp3 = $('mp3-file').files[0];
  const script = $('script-file').files[0];
  if (!mp3 || !script) { setStatus('Cần chọn đủ file MP3 và file kịch bản .txt'); return; }
  setStatus('Đang đọc file…');
  const { title, paragraphs } = parseTimestampScript(await script.text());
  if (!paragraphs.length) { setStatus('Không thấy dòng nào có mốc thời gian dạng 00:16 trong file kịch bản'); return; }
  const snapped = snapParagraphsToPauses(paragraphs, await decodePauses(mp3));
  const newLesson = { title, paragraphs: snapped, audio: mp3, savedAt: Date.now() };
  await saveLesson(newLesson);
  localStorage.setItem(POSITION_KEY, '0');
  showLesson(newLesson);
  setStatus(`Đã nạp ${snapped.length} đoạn`);
}

function setStatus(message) {
  $('status').textContent = message;
}

// ---------- Hiển thị ----------

function showLesson(newLesson) {
  lesson = newLesson;
  if (audioUrl) URL.revokeObjectURL(audioUrl);
  audioUrl = URL.createObjectURL(lesson.audio);
  audio.src = audioUrl;
  audio.addEventListener('loadedmetadata', () => {
    audio.currentTime = Number(localStorage.getItem(POSITION_KEY) || 0);
    applySpeed();
  }, { once: true });
  $('title').textContent = lesson.title;
  $('paragraph-list').replaceChildren(...lesson.paragraphs.map((p, i) => {
    const item = document.createElement('li');
    item.textContent = p.text;
    item.addEventListener('click', () => goTo(i));
    return item;
  }));
  currentIndex = -1;
  updateCurrentParagraph();
  $('setup').open = false;
  $('player').hidden = false;
}

function indexAt(time) {
  let index = 0;
  lesson.paragraphs.forEach((p, i) => { if (p.time <= time + 0.05) index = i; });
  return index;
}

function updateCurrentParagraph() {
  if (!lesson) return;
  const index = indexAt(audio.currentTime);
  if (index === currentIndex) return;
  currentIndex = index;
  const paragraph = lesson.paragraphs[index];
  $('counter').textContent = `Đoạn ${index + 1}/${lesson.paragraphs.length}`;
  $('text').textContent = paragraph.text;
  [...$('paragraph-list').children].forEach((li, i) => li.classList.toggle('active', i === index));
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: `Đoạn ${index + 1}/${lesson.paragraphs.length}`,
      artist: paragraph.text,
      album: lesson.title,
    });
  }
}

// ---------- Điều hướng ----------

function goTo(index) {
  const clamped = Math.max(0, Math.min(lesson.paragraphs.length - 1, index));
  audio.currentTime = lesson.paragraphs[clamped].time;
  updateCurrentParagraph();
  if (audio.paused) audio.play();
}

const nextParagraph = () => goTo(indexAt(audio.currentTime) + 1);

// Như máy nghe nhạc: đang nghe dở đoạn (> 2 giây) thì phát lại từ đầu đoạn, vừa vào đoạn thì lùi về đoạn trước.
function previousParagraph() {
  const index = indexAt(audio.currentTime);
  const intoParagraph = audio.currentTime - lesson.paragraphs[index].time;
  goTo(intoParagraph > RESTART_THRESHOLD_SECONDS ? index : index - 1);
}

function togglePlay() {
  if (audio.paused) audio.play(); else audio.pause();
}

// Lặp đoạn: khi chạm đầu đoạn kế tiếp (hoặc hết bài) thì quay về đầu đoạn đang học.
function handleRepeat() {
  if (!$('repeat').checked || currentIndex < 0) return;
  const next = lesson.paragraphs[currentIndex + 1];
  if (next && audio.currentTime >= next.time - 0.05) audio.currentTime = lesson.paragraphs[currentIndex].time;
}

function applySpeed() {
  const rate = Number($('speed').value);
  audio.preservesPitch = true;
  audio.defaultPlaybackRate = rate;
  audio.playbackRate = rate;
}

// ---------- Media Session: màn hình khóa, tai nghe, xe ----------

function setupMediaSession() {
  if (!('mediaSession' in navigator)) return;
  const handlers = {
    play: () => audio.play(),
    pause: () => audio.pause(),
    nexttrack: nextParagraph,
    previoustrack: previousParagraph,
    seekto: (details) => { audio.currentTime = details.seekTime; },
  };
  for (const [action, handler] of Object.entries(handlers)) {
    try { navigator.mediaSession.setActionHandler(action, handler); } catch {}
  }
}

// ---------- Sự kiện ----------

audio.addEventListener('timeupdate', () => {
  if (!lesson) return;
  handleRepeat();
  updateCurrentParagraph();
  localStorage.setItem(POSITION_KEY, String(audio.currentTime));
  if ('mediaSession' in navigator && audio.duration) {
    try { navigator.mediaSession.setPositionState({ duration: audio.duration, position: audio.currentTime, playbackRate: audio.playbackRate }); } catch {}
  }
});
audio.addEventListener('ended', () => {
  if ($('repeat').checked && currentIndex >= 0) goTo(currentIndex);
});
audio.addEventListener('play', () => { $('play').textContent = '⏸ Dừng'; });
audio.addEventListener('pause', () => { $('play').textContent = '▶ Phát'; });

$('play').addEventListener('click', togglePlay);
$('prev').addEventListener('click', previousParagraph);
$('next').addEventListener('click', nextParagraph);
$('import').addEventListener('click', () => importLesson().catch((error) => setStatus(`Lỗi: ${error.message}`)));
$('speed').addEventListener('change', () => { applySpeed(); localStorage.setItem(SPEED_KEY, $('speed').value); });

$('speed').value = localStorage.getItem(SPEED_KEY) || '0.8';
setupMediaSession();
loadLesson()
  .then((saved) => { if (saved) showLesson(saved); else $('setup').open = true; })
  .catch(() => { $('setup').open = true; });

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
