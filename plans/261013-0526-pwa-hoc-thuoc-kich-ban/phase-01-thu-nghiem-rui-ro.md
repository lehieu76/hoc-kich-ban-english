---
phase: 1
title: "Thử nghiệm rủi ro trên máy thật"
status: pending
effort: 3h
depends_on: []
---

# Phase 1 — Thử nghiệm rủi ro trên máy thật

## Mục tiêu
Chứng minh 2 giả định quan trọng nhất trước khi đầu tư làm app.

## Việc cần làm
- [ ] Trang HTML thử nghiệm (1 file): phát 1 file âm thanh dài, đăng ký Media Session (`play`, `pause`, `nexttrack`, `previoustrack`), mỗi lần nhận lệnh thì nhảy tới mốc và ghi log ra màn hình.
- [ ] Mở qua HTTPS trên điện thoại Android của bé (tạm dùng GitHub Pages hoặc `npx vite --host` + tunnel).
- [ ] Kiểm tra với: tai nghe Bluetooth/có dây (bấm 1/2/3 lần), loa xe Bluetooth (nút next/prev), khi khóa màn hình, khi chuyển sang app khác.
- [ ] Script Node thử cắt câu bài Fleming bằng phát hiện khoảng lặng (giải mã MP3 bằng thư viện JS thuần), in số câu tìm được và thời điểm.

- [ ] Nút chọn tốc độ 0,8× / 0,9× / 1,0× (`playbackRate` + `preservesPitch`) để Sếp nghe đánh giá chất lượng giọng khi chậm.
- [ ] Đo khoảng nghỉ giữa các câu trong file Fleming hiện tại; báo Sếp có cần tạo lại file theo quy ước (≥ 1 giây giữa câu, ≥ 2 giây giữa đoạn) không.

## Tiêu chí đạt
- Khóa màn hình 10 phút vẫn phát liên tục; cả 3 kiểu bấm nút tai nghe và nút xe đều tới được trang.
- Giọng 0,8× nghe tự nhiên, Sếp chấp nhận được.
- Tìm đúng ranh giới cho ≥ 90% số câu bài Fleming.

## Nếu không đạt
Dừng lại báo Sếp. Phương án B: app chỉ dùng để dựng và xuất file MP3 luyện tập, phát trên xe bằng trình nghe nhạc có sẵn (nút next/prev chuyển giữa các file theo câu).

## Kết quả (13/10/2026)
- Đo file Fleming hiện tại: nghỉ giữa các câu chỉ 0,4–1,1 giây, chồng lấn với chỗ ngắt hơi trong câu (dài nhất 0,42 giây so với ranh giới câu ngắn nhất 0,44 giây). Cắt tự động theo số câu bị lệch từ khoảng câu 19. → Cần tạo lại file theo quy ước ≥ 1 giây giữa câu, ≥ 2 giây giữa đoạn.
- Trang thử nghiệm `spike/` chạy đúng trên Chromium headless: dựng bài bíp giả lập, chuyển câu, đổi tốc độ 0,8× giữ cao độ, dựng "Nghe – nhắc lại" từ MP3 (bài Fleming → file WAV 480 giây, 21 MB).
- Chờ kiểm tra trên điện thoại thật: nút tai nghe, nút xe, phát khi khóa màn hình.
