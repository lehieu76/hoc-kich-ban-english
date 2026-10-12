---
phase: 8
title: "Đồng bộ online Supabase"
status: pending
effort: 7h
depends_on: [3]
---

# Phase 8 — Đồng bộ online Supabase

## Mục tiêu
Bài học và tiến độ dùng chung giữa máy tính, điện thoại trên xe và tablet ở nhà; không phụ thuộc giới hạn bộ nhớ trình duyệt; trên xe vẫn chạy offline.

## Việc cần làm
- [ ] Tạo project Supabase (gói miễn phí). Bảng: `lessons`, `paragraphs`, `sentences` (ranh giới thời gian), `progress` (mức thuộc, ngày ôn tiếp), `settings` (tốc độ phát chung), `recordings` (tùy chọn). Bucket Storage riêng tư `lesson-audio`.
- [ ] Bật Row Level Security: chỉ tài khoản gia đình đọc/ghi được dữ liệu của mình. Khóa `anon` nằm trong mã nguồn công khai là bình thường; bảo mật dựa vào RLS.
- [ ] Đăng nhập bằng email (link đăng nhập gửi qua mail), giữ phiên đăng nhập lâu dài trên máy của bé.
- [ ] Gắn Supabase vào lớp lưu trữ: tải bài mới về IndexedDB để dùng offline; ghi tiến độ vào hàng đợi khi mất mạng, có mạng thì đẩy lên; xung đột thì bản ghi `updated_at` mới hơn thắng.
- [ ] Màn hình "Thêm bài" trên máy tính: tải MP3 + kịch bản lên, cắt câu và duyệt ngay trên máy tính.
- [ ] Sao lưu: nút xuất toàn bộ dữ liệu ra file JSON + MP3.

## Tiêu chí đạt
- Thêm bài trên máy tính → 1 phút sau điện thoại có bài, tải về để dùng offline.
- Bật chế độ máy bay, học 1 lộ trình, tắt chế độ máy bay → tiến độ lên tablet đúng.
- Tài khoản khác không đọc được dữ liệu (kiểm tra RLS).
