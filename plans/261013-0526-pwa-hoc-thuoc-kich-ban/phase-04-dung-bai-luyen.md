---
phase: 4
title: "Dựng bài luyện thành file âm thanh"
status: pending
effort: 6h
depends_on: [3]
---

# Phase 4 — Dựng bài luyện thành file âm thanh

## Việc cần làm
- [ ] Mô tả mỗi chế độ (Nghe, Nghe – nhắc lại, Dồn đoạn, Điền nửa câu, Tự nói cả đoạn) thành danh sách "khối": câu nhắc tiếng Việt · đoạn âm thanh câu · im lặng N giây.
- [ ] Điền nửa câu: cắt tại khoảng lặng ngắn gần giữa câu nhất (ngắt ở dấu phẩy); nếu không có thì cắt tại khoảng ngắt từ gần 50% nhất.
- [ ] Dựng danh sách khối thành 1 file WAV mono 22 kHz bằng `OfflineAudioContext`, trả về kèm mốc thời gian từng câu.
- [ ] Cài đặt chung: tốc độ phát (0,8× / 0,9× / 1,0× / 1,1×, mặc định 0,8×), hệ số độ dài khoảng lặng (mặc định 1,3×), số lần lặp. Tốc độ áp dụng lúc phát qua `playbackRate` + `preservesPitch`.
- [ ] Nút "Xuất MP3/WAV" để dùng phương án dự phòng (trình nghe nhạc thường).
- [ ] Nạp câu nhắc tiếng Việt do Sếp tạo (mỗi câu 1 file MP3, đặt đúng tên dưới đây vào `public/prompts/`):

| Tên file | Nội dung |
|---|---|
| `bat-dau.mp3` | Mình bắt đầu học nhé! |
| `doan-1.mp3` … `doan-8.mp3` | Đoạn một. … Đoạn tám. |
| `che-do-nghe.mp3` | Con nghe kỹ nhé. |
| `che-do-nhac-lai.mp3` | Bây giờ con nghe và nhắc lại theo nhé. |
| `che-do-noi-not.mp3` | Con thử nói nốt câu nhé. |
| `che-do-don-doan.mp3` | Mình đọc lại từ đầu nhé. |
| `che-do-tu-noi.mp3` | Bây giờ con tự nói cả đoạn nhé. |
| `on-bai-cu.mp3` | Mình ôn lại bài cũ trước nhé. |
| `nghi-giai-lao.mp3` | Giỏi lắm! Nghỉ một chút nhé. |
| `ket-thuc.mp3` | Hôm nay con học tốt lắm. Hẹn gặp lại nhé! |

## Tiêu chí đạt
- Unit test: thời lượng file dựng = tổng các khối; mốc câu đúng.
- Xuất ngay được file "Nghe – nhắc lại" bài Fleming cho bé dùng từ tuần 1.
