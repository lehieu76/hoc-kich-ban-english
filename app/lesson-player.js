// Trình phát học theo đoạn: chữ to + Phát/Dừng + Đoạn trước/sau.
// Điều khiển được từ màn hình khóa / tai nghe / Bluetooth xe qua Media Session.

const $ = (id) => document.getElementById(id);
const audio = $('audio');
const LESSON_KEY = 'lesson-id';
const SPEED_KEY = 'lesson-speed';
const positionKey = (id) => `lesson-position:${id}`;
const RESTART_THRESHOLD_SECONDS = 2;
const SPEED_STEP = 0.05;
const MIN_SPEED = 0.5;
const MAX_SPEED = 1.5;

let lesson = null;
let audioUrl = null;
let currentIndex = -1;
let speed = Number(localStorage.getItem(SPEED_KEY)) || 0.8;

// ---------- Nạp bài (bài có sẵn trong app/lessons) ----------

async function loadLessonList() {
  const lessons = await (await fetch('lessons/index.json')).json();
  const select = $('lesson-select');
  select.replaceChildren(...lessons.map((l) => new Option(l.title, l.id)));
  select.hidden = lessons.length < 2;
  const savedId = localStorage.getItem(LESSON_KEY);
  select.value = lessons.some((l) => l.id === savedId) ? savedId : lessons[0].id;
  await openLesson(select.value);
}

async function openLesson(id) {
  const data = await (await fetch(`lessons/${id}/lesson.json`)).json();
  lesson = { id, ...data };
  localStorage.setItem(LESSON_KEY, id);
  // Tải trọn file rồi phát từ bộ nhớ: tua/nhảy đoạn luôn chạy, kể cả khi offline (service worker trả bản đã lưu).
  $('text').textContent = 'Đang tải bài…';
  const blob = await (await fetch(`lessons/${id}/${data.audio}`)).blob();
  if (audioUrl) URL.revokeObjectURL(audioUrl);
  audioUrl = URL.createObjectURL(blob);
  audio.src = audioUrl;
  audio.addEventListener('loadedmetadata', () => {
    audio.currentTime = Number(localStorage.getItem(positionKey(id)) || 0);
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

// Tốc độ nói: giữ nguyên cao độ giọng, lưu lại cho tới khi người dùng chỉnh tiếp.
function applySpeed() {
  audio.preservesPitch = true;
  audio.defaultPlaybackRate = speed;
  audio.playbackRate = speed;
  $('speed-value').textContent = `${speed.toFixed(2).replace('.', ',')}×`;
  $('slower').disabled = speed <= MIN_SPEED + 0.001;
  $('faster').disabled = speed >= MAX_SPEED - 0.001;
}

function changeSpeed(delta) {
  speed = Math.round(Math.min(MAX_SPEED, Math.max(MIN_SPEED, speed + delta)) * 100) / 100;
  localStorage.setItem(SPEED_KEY, String(speed));
  applySpeed();
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
  localStorage.setItem(positionKey(lesson.id), String(audio.currentTime));
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
$('slower').addEventListener('click', () => changeSpeed(-SPEED_STEP));
$('faster').addEventListener('click', () => changeSpeed(SPEED_STEP));
$('lesson-select').addEventListener('change', (event) => { audio.pause(); openLesson(event.target.value); });

applySpeed();
setupMediaSession();
loadLessonList().catch((error) => { $('text').textContent = `Không tải được bài: ${error.message}`; $('player').hidden = false; });

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
