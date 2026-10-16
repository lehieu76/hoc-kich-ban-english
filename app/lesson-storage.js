// Lưu bài học (file MP3 + đoạn + mốc) ngay trên máy bằng IndexedDB → mở lại không cần chọn file, chạy offline.
const DB_NAME = 'hoc-kich-ban';
const STORE = 'lessons';
const CURRENT_KEY = 'current';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run(mode, action) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = action(db.transaction(STORE, mode).objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const saveLesson = (lesson) => run('readwrite', (store) => store.put(lesson, CURRENT_KEY));
export const loadLesson = () => run('readonly', (store) => store.get(CURRENT_KEY));
