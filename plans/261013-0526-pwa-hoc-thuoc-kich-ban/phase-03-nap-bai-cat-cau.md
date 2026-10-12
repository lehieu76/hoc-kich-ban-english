---
phase: 3
title: "Nạp bài + cắt câu tự động"
status: pending
effort: 7h
depends_on: [2]
---

# Phase 3 — Nạp bài + cắt câu tự động

## Việc cần làm
- [ ] Màn hình "Thêm bài": chọn file MP3 + file `.txt` (hoặc dán văn bản).
- [ ] Bộ tách kịch bản: bỏ dòng trang trí (`*****`), dòng tiêu đề viết hoa; dòng trống = sang đoạn mới; tách câu trong dòng theo `. ? !` + khoảng trắng + chữ hoa; giữ nguyên dấu ngoặc kép.
- [ ] Nếu kịch bản không có dòng trống: tự gom ~5 câu/đoạn, cho chỉnh ở màn hình duyệt.
- [ ] Bộ cắt câu: giải mã MP3 bằng `AudioContext.decodeAudioData`, tính năng lượng theo khung 20 ms, tìm các đoạn im lặng, chọn N−1 khoảng lặng dài nhất theo thứ tự thời gian làm ranh giới.
- [ ] Nhận diện đoạn: khoảng nghỉ ≥ 2 giây = ranh giới đoạn; đối chiếu với dòng trống trong kịch bản, báo khi lệch.
- [ ] Màn hình duyệt: danh sách câu, bấm để nghe từng câu; nút "dời ranh giới sang trái/phải" và "gộp/tách" khi lệch.
- [ ] Chuẩn hóa kịch bản Fleming thành 6 đoạn: Chào hỏi · Fleming là ai · Phát hiện penicillin · Giải Nobel · 3 lý do ngưỡng mộ · Kết luận.

## Tiêu chí đạt
- Unit test bộ tách kịch bản với file Fleming ra đúng số câu và 6 đoạn.
- Nạp bài Fleming trên điện thoại: ranh giới đúng ≥ 90% câu, chỉnh tay phần còn lại dưới 2 phút.
