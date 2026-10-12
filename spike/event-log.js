// Nhật ký sự kiện lưu localStorage để xem lại sau khi mở khóa màn hình.
const STORAGE_KEY = 'spike-event-log';
let entries = [];
try { entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { entries = []; }
let onChange = () => {};

export function log(message) {
  const time = new Date().toLocaleTimeString('vi-VN', { hour12: false });
  entries.unshift(`${time}  ${message}`);
  entries = entries.slice(0, 300);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch {}
  onChange(entries);
}

export function clearLog() {
  entries = [];
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  onChange(entries);
}

export function watchLog(callback) {
  onChange = callback;
  callback(entries);
}

export function logText() {
  return entries.join('\n');
}
