// Nghe phím từ remote chụp ảnh Bluetooth (giả lập bàn phím: thường gửi Volume+ hoặc Enter).
// Tự đếm số lần bấm trong 600 ms: 1 lần = nghe lại câu, 2 lần = câu sau.
// Chỉ hoạt động khi trang đang mở và màn hình sáng → đi kèm Wake Lock giữ màn hình.
import { log } from './event-log.js';

const MULTI_PRESS_WINDOW_MS = 600;

export function listenRemoteKeys({ onSinglePress, onDoublePress }) {
  let pressCount = 0;
  let timer = null;
  document.addEventListener('keydown', (event) => {
    log(`PHÍM: key=${event.key} code=${event.code} keyCode=${event.keyCode}${event.repeat ? ' (giữ)' : ''}`);
    if (event.repeat || event.target.closest?.('input, select')) return;
    event.preventDefault();
    pressCount += 1;
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (pressCount >= 2) onDoublePress(); else onSinglePress();
      pressCount = 0;
    }, MULTI_PRESS_WINDOW_MS);
  });
}

// Giữ màn hình sáng; xin lại khi quay về trang (Android tự nhả khi trang bị ẩn).
export function setupScreenWakeLock(checkbox) {
  let lock = null;
  const acquire = async () => {
    if (!checkbox.checked || !('wakeLock' in navigator) || document.hidden) return;
    try { lock = await navigator.wakeLock.request('screen'); log('☀ giữ màn hình sáng: bật'); }
    catch (error) { log(`⚠ không giữ được màn hình sáng: ${error.message}`); }
  };
  checkbox.addEventListener('change', () => {
    if (checkbox.checked) acquire();
    else if (lock) { lock.release(); lock = null; log('☀ giữ màn hình sáng: tắt'); }
  });
  document.addEventListener('visibilitychange', acquire);
  if (!('wakeLock' in navigator)) log('⚠ Trình duyệt không hỗ trợ giữ màn hình sáng');
}
