// Trình phát học theo câu: chữ to + Phát/Dừng + Câu trước/sau, lặp 1 câu hoặc lặp cả slide.
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
// Chế độ lặp, bấm nút lặp để đổi vòng: tắt → lặp câu → lặp slide (chỉ khi bài có slide) → tắt.
let repeatMode = 'off';

const TEXT_SIZE_KEY = 'text-size';
const TEXT_SIZE_STEP = 4;
const MIN_TEXT_SIZE = 20;
const MAX_TEXT_SIZE = 60;
let textSize = Number(localStorage.getItem(TEXT_SIZE_KEY)) || 32;

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
  lesson.slides ??= [];
  if (!lesson.slides.length && repeatMode === 'slide') repeatMode = 'off';
  $('title').textContent = lesson.title;
  renderParagraphList();
  currentIndex = -1;
  updateCurrentParagraph();
  $('player').hidden = false;
}

// Danh sách câu, chia nhóm theo slide (chạm tên slide để nhảy tới câu đầu slide).
function renderParagraphList() {
  const makeList = (indexes) => {
    const list = document.createElement('ol');
    list.start = indexes[0] + 1;
    list.append(...indexes.map((i) => {
      const item = document.createElement('li');
      item.textContent = lesson.paragraphs[i].text;
      item.dataset.index = i;
      item.addEventListener('click', () => goTo(i));
      return item;
    }));
    return list;
  };
  const allIndexes = lesson.paragraphs.map((_, i) => i);
  if (!lesson.slides.length) {
    $('paragraph-list').replaceChildren(makeList(allIndexes));
    return;
  }
  $('paragraph-list').replaceChildren(...lesson.slides.flatMap((slide, s) => {
    const indexes = allIndexes.filter((i) => lesson.paragraphs[i].slide === s);
    if (!indexes.length) return [];
    const heading = document.createElement('h3');
    heading.textContent = slideLabel(s);
    heading.addEventListener('click', () => goTo(indexes[0]));
    return [heading, makeList(indexes)];
  }));
}

const slideLabel = (s) => `Slide ${s + 1}/${lesson.slides.length} – ${lesson.slides[s].title}`;

// Khoảng câu [first, last] của slide chứa câu `index`.
function slideRange(index) {
  const slide = lesson.paragraphs[index].slide;
  let first = index;
  let last = index;
  while (first > 0 && lesson.paragraphs[first - 1].slide === slide) first--;
  while (last < lesson.paragraphs.length - 1 && lesson.paragraphs[last + 1].slide === slide) last++;
  return { first, last };
}

// Khoảng câu đang lặp: 1 câu, hoặc cả slide.
const repeatRange = (index) => (repeatMode === 'slide' ? slideRange(index) : { first: index, last: index });

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
  const hasSlide = paragraph.slide !== undefined && lesson.slides[paragraph.slide];
  $('title').textContent = hasSlide ? slideLabel(paragraph.slide) : lesson.title;
  $('counter').textContent = `Câu ${index + 1}/${lesson.paragraphs.length}`;
  $('text').textContent = paragraph.text;
  updateRepeatButton();
  $('paragraph-list').querySelectorAll('li').forEach((li) => li.classList.toggle('active', Number(li.dataset.index) === index));
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: `${hasSlide ? `Slide ${paragraph.slide + 1} – ` : ''}Câu ${index + 1}/${lesson.paragraphs.length}`,
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

// Đang lặp slide thì Tiến/Lùi nhảy theo slide, còn lại nhảy theo câu.
function nextParagraph() {
  const index = indexAt(audio.currentTime);
  if (repeatMode !== 'slide') return goTo(index + 1);
  const { last } = slideRange(index);
  if (last < lesson.paragraphs.length - 1) goTo(last + 1);
}

// Như máy nghe nhạc: đang nghe dở câu/slide (> 2 giây) thì phát lại từ đầu, vừa vào thì lùi về câu/slide trước.
function previousParagraph() {
  const index = indexAt(audio.currentTime);
  const { first } = repeatRange(index);
  const intoRange = audio.currentTime - lesson.paragraphs[first].time;
  if (intoRange > RESTART_THRESHOLD_SECONDS || first === 0) return goTo(first);
  goTo(repeatMode === 'slide' ? slideRange(first - 1).first : first - 1);
}

function togglePlay() {
  if (audio.paused) audio.play(); else audio.pause();
}

// Lặp: khi chạm đầu câu ngay sau khoảng đang lặp (hoặc hết bài) thì quay về đầu khoảng (câu hoặc slide).
// Chỉ xét sát mép (≤ 1 giây) để tua xa sang chỗ khác thì lặp theo chỗ mới, không bị kéo về.
function handleRepeat() {
  if (repeatMode === 'off' || currentIndex < 0) return;
  const { first, last } = repeatRange(currentIndex);
  const next = lesson.paragraphs[last + 1];
  if (next && audio.currentTime >= next.time - 0.05 && audio.currentTime < next.time + 1) {
    audio.currentTime = lesson.paragraphs[first].time;
  }
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

// Nút lặp: tắt = xám, lặp câu = cam, lặp slide = tím, kèm câu/slide đang lặp.
function updateRepeatButton() {
  const button = $('repeat');
  button.dataset.mode = repeatMode;
  button.setAttribute('aria-pressed', String(repeatMode !== 'off'));
  if (repeatMode === 'off' || currentIndex < 0) {
    button.textContent = '🔁 Lặp lại: TẮT';
  } else if (repeatMode === 'sentence') {
    button.textContent = `🔁 ĐANG LẶP CÂU ${currentIndex + 1}`;
  } else {
    const { first, last } = slideRange(currentIndex);
    button.textContent = `🔁 ĐANG LẶP SLIDE ${lesson.paragraphs[currentIndex].slide + 1} (câu ${first + 1}–${last + 1})`;
  }
  $('repeat-hint').textContent = lesson?.slides.length ? 'TẮT → LẶP CÂU → LẶP SLIDE → TẮT' : 'TẮT → LẶP CÂU → TẮT';
}

function cycleRepeatMode() {
  const modes = lesson?.slides.length ? ['off', 'sentence', 'slide'] : ['off', 'sentence'];
  repeatMode = modes[(modes.indexOf(repeatMode) + 1) % modes.length];
  updateRepeatButton();
}

// Cỡ chữ đoạn đang đọc: lưu lại cho tới khi người dùng chỉnh tiếp.
function applyTextSize() {
  document.documentElement.style.setProperty('--text-size', `${textSize}px`);
  $('text-smaller').disabled = textSize <= MIN_TEXT_SIZE;
  $('text-larger').disabled = textSize >= MAX_TEXT_SIZE;
}

function changeTextSize(delta) {
  textSize = Math.min(MAX_TEXT_SIZE, Math.max(MIN_TEXT_SIZE, textSize + delta));
  localStorage.setItem(TEXT_SIZE_KEY, String(textSize));
  applyTextSize();
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
  if (repeatMode !== 'off' && currentIndex >= 0) goTo(repeatRange(currentIndex).first);
});
audio.addEventListener('play', () => { $('play').textContent = '⏸ Dừng'; });
audio.addEventListener('pause', () => { $('play').textContent = '▶ Phát'; });

$('play').addEventListener('click', togglePlay);
$('prev').addEventListener('click', previousParagraph);
$('next').addEventListener('click', nextParagraph);
$('slower').addEventListener('click', () => changeSpeed(-SPEED_STEP));
$('faster').addEventListener('click', () => changeSpeed(SPEED_STEP));
$('text-smaller').addEventListener('click', () => changeTextSize(-TEXT_SIZE_STEP));
$('text-larger').addEventListener('click', () => changeTextSize(TEXT_SIZE_STEP));
$('repeat').addEventListener('click', cycleRepeatMode);
$('lesson-select').addEventListener('change', (event) => { audio.pause(); openLesson(event.target.value); });

applySpeed();
applyTextSize();
setupMediaSession();
loadLessonList().catch((error) => { $('text').textContent = `Không tải được bài: ${error.message}`; $('player').hidden = false; });

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(() => {});
