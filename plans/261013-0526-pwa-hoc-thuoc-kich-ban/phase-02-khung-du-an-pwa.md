---
phase: 2
title: "Khung dự án + PWA offline"
status: pending
effort: 3h
depends_on: [1]
---

# Phase 2 — Khung dự án + PWA offline

## Việc cần làm
- [ ] `git init`, Vite + TypeScript thuần, `vite-plugin-pwa` (precache toàn bộ app), manifest có icon, cài được lên màn hình chính.
- [ ] Lớp lưu trữ IndexedDB (thư viện `idb`): bảng `lessons` (tiêu đề, đoạn, câu, ranh giới thời gian), `audio` (blob MP3 gốc), `progress` (đoạn đã thuộc, ngày ôn tiếp).
- [ ] Bố cục 3 màn hình: Danh sách bài · Học trên xe · Học ở nhà. Chữ to, nút to, hỗ trợ giao diện tối.
- [ ] Thiết kế dữ liệu sẵn cho đồng bộ: id dạng UUID, mỗi bản ghi có `updated_at`; lớp lưu trữ là interface để phase 8 gắn Supabase vào mà không sửa phần khác.
- [ ] Vitest cho phần logic thuần (tách câu, chọn ranh giới, lịch ôn).

## Cấu trúc thư mục dự kiến
```
src/
  storage/lesson-database.ts
  lesson/script-text-parser.ts
  lesson/silence-based-sentence-segmenter.ts
  practice/practice-track-renderer.ts
  practice/practice-modes.ts
  player/hands-free-media-player.ts
  player/daily-learning-route.ts
  screens/…
public/prompts/   (câu nhắc tiếng Việt)
```

## Tiêu chí đạt
App cài lên Android, tắt mạng mở lại vẫn chạy.
