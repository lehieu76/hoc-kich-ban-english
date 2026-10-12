---
title: "PWA học thuộc kịch bản thuyết trình tiếng Anh bằng tai"
description: "Web app cài trên Android giúp bé 8 tuổi luyện phát âm và học thuộc kịch bản trên xe, điều khiển hoàn toàn bằng nút tai nghe/Bluetooth, không cần nhìn màn hình."
status: pending
priority: P1
effort: 39h
branch: main
tags: [frontend, pwa, audio, offline, supabase]
blockedBy: []
blocks: []
created: 2026-10-13
---

# PWA học thuộc kịch bản bằng tai

## Mục tiêu
Bé (8 tuổi, tự đọc được tiếng Anh) học thuộc và nói đúng phát âm bài thuyết trình ~3 phút trong hơn 1 tháng, chủ yếu trên xe ô tô, không nhìn màn hình. App dùng lại được cho mọi bài sau: chỉ cần nạp file MP3 (giọng AI do Sếp tự tạo) + file kịch bản `.txt`.

## Bối cảnh đã xác định
- Thiết bị: Android, nghe qua tai nghe riêng hoặc loa xe Bluetooth. Không có CarPlay/Android Auto.
- Bài đầu: `input/Alexander-Fleming.mp3` (MP3 128 kbps, ~2 phút 21 giây) + `input/kich-ban-tieng-Anh.txt` (357 từ, ~35 câu).
- Giọng mẫu là giọng AI → khoảng lặng giữa các câu sạch, ổn định → cắt câu bằng phát hiện khoảng lặng là đủ, không cần mô hình nhận dạng giọng nói.
- Máy dev: WSL, có Node 24, chưa có ffmpeg/whisper (không cần cho thiết kế này).

## Quyết định kiến trúc
1. **PWA, không làm app gốc.** Vite + TypeScript thuần (không framework) + `vite-plugin-pwa`. Dữ liệu bài học lưu trên máy bằng IndexedDB để chạy offline, đồng bộ lên Supabase (xem quyết định 6).
2. **Cắt câu ngay trên điện thoại** bằng Web Audio API: giải mã MP3, đo năng lượng, lấy N−1 khoảng lặng dài nhất (N = số câu trong kịch bản) làm ranh giới. Có màn hình duyệt để chỉnh tay khi lệch.
3. **"Dựng sẵn bài luyện thành 1 file âm thanh"** (OfflineAudioContext → WAV) cho mỗi buổi học, kèm danh sách mốc thời gian từng câu. Phát bằng 1 thẻ `<audio>` duy nhất. Lý do: khi màn hình tắt, Chrome Android hạn chế timer JS; một file liên tục là cách chắc chắn nhất để phát nền ổn định và giữ nút media hoạt động. Khoảng lặng để bé nhắc lại là im lặng thật trong file, không phải `setTimeout`.
4. **Điều khiển rảnh tay qua Media Session API**: Android tự map nút tai nghe (bấm 1 = phát/dừng, bấm 2 = câu sau, bấm 3 = câu trước) và nút next/prev trên Bluetooth xe. App nhảy theo mốc câu trong file đã dựng.
5. **Tốc độ giọng đọc: 1 cài đặt chung cho cả bài.** Giai đoạn học lần đầu để chậm (mặc định 0,8×); khi bé đã thuộc hoàn toàn thì người lớn tăng dần lên 0,9× → 1,0× (tối đa 1,1×). Dùng `audio.playbackRate` với `preservesPitch` (Chrome hỗ trợ sẵn) nên giọng chậm lại mà không bị trầm, không cần thư viện xử lý âm thanh. Khoảng lặng nhắc lại cũng giãn theo cùng tỉ lệ.
6. **Lưu trữ online bằng Supabase (gói miễn phí: 1 GB file, 500 MB dữ liệu).** File MP3 lưu ở Supabase Storage; bài học, ranh giới câu, tiến độ, cài đặt tốc độ lưu ở Postgres. Đăng nhập 1 tài khoản gia đình bằng email. Lợi ích: thêm bài từ máy tính, điện thoại trên xe và tablet ở nhà dùng chung tiến độ, không lo đầy bộ nhớ trình duyệt. Trên xe vẫn chạy offline nhờ bản lưu đệm trong IndexedDB, có mạng thì tự đồng bộ.
7. **Lộ trình hôm nay tự chạy nối tiếp các chế độ** để trên xe không phải chọn gì. Câu nhắc tiếng Việt ngắn (file âm thanh dựng sẵn) báo bé đang ở phần nào.

## Các chế độ luyện
| Chế độ | Cách chạy |
|---|---|
| Nghe | Phát đoạn liền mạch, tốc độ chuẩn |
| Nghe – nhắc lại | Mỗi câu: phát → im lặng (≈ 1,3 × độ dài câu) để bé nói → phát lại lần 2 |
| Dồn đoạn | Đọc từ đoạn 1 đến đoạn đang học, có khoảng lặng giữa các đoạn |
| Điền nửa câu | Phát nửa đầu câu → im lặng để bé nói nốt → phát cả câu để bé tự so |
| Tự nói cả đoạn | Chỉ phát câu đầu đoạn làm "mồi", sau đó im lặng, rồi phát đáp án |

Lộ trình mặc định cho mỗi đoạn mới: Nghe → Nghe – nhắc lại → Điền nửa câu → Dồn đoạn. Đoạn đã thuộc chuyển sang ôn giãn cách (1–2–4–7 ngày).

## Các phase
| # | Phase | Ước lượng | Trạng thái |
|---|---|---|---|
| 1 | [Thử nghiệm rủi ro trên máy thật](phase-01-thu-nghiem-rui-ro.md) | 3h | pending |
| 2 | [Khung dự án + PWA offline](phase-02-khung-du-an-pwa.md) | 3h | pending |
| 3 | [Nạp bài + cắt câu tự động](phase-03-nap-bai-cat-cau.md) | 7h | pending |
| 4 | [Dựng bài luyện thành file âm thanh](phase-04-dung-bai-luyen.md) | 6h | pending |
| 5 | [Trình phát rảnh tay + lộ trình hôm nay](phase-05-trinh-phat-ranh-tay.md) | 6h | pending |
| 6 | [Màn hình học ở nhà + ghi âm](phase-06-hoc-o-nha-ghi-am.md) | 4h | pending |
| 7 | [Triển khai + chạy thử với bé](phase-07-trien-khai-chay-thu.md) | 3h | pending |
| 8 | [Đồng bộ online Supabase](phase-08-dong-bo-online-supabase.md) | 7h | pending |

Thứ tự phụ thuộc: 1 → 2 → 3 → 4 → 5 → 7; phase 6 và phase 8 làm sau phase 3, trước phase 7.

## Mốc thời gian đề xuất (hạn > 1 tháng)
- **Tuần 1:** phase 1–3. Cuối tuần 1 có bản xuất file MP3 "Nghe – nhắc lại" cho bài Fleming để bé bắt đầu học ngay trên xe (phát bằng trình nghe nhạc thường).
- **Tuần 2:** phase 4–5. Bé dùng app trên xe.
- **Tuần 3:** phase 6, 8, 7, chỉnh theo phản hồi của bé.
- **Tuần 4 trở đi:** bé ôn và tập đứng thuyết trình ở nhà.

## Rủi ro chính
- Chrome Android dừng phát khi khóa màn hình hoặc nút tai nghe không gửi được về PWA → phase 1 kiểm chứng trước khi làm tiếp. Phương án dự phòng: xuất file MP3/WAV để phát bằng app nghe nhạc có sẵn.
- Giọng AI có ngắt hơi dài ở dấu phẩy, làm lệch ranh giới câu → màn hình chỉnh tay ở phase 3.
- File WAV dựng sẵn lớn (~5 MB/phút) → dựng theo từng buổi, mono 22 kHz, xóa sau khi dùng.

## Quyết định đã chốt (13/10/2026)
1. Hosting app: GitHub Pages, repo công khai (không chứa dữ liệu của bé; dữ liệu nằm ở Supabase, có RLS).
2. Câu nhắc tiếng Việt: Sếp tự tạo bằng công cụ giọng AI của Sếp theo danh sách ở phase 4.
3. Kịch bản: dòng trống = sang đoạn mới. Bài Fleming chia 6 đoạn.
4. Đơn vị: **cắt âm thanh theo câu, học thuộc theo đoạn.** Câu là đơn vị luyện phát âm và nhắc lại; đoạn là đơn vị học thuộc, đánh dấu "đã thuộc" và lên lịch ôn.
5. Quy ước file giọng mẫu: 1 file MP3 cả bài, nghỉ ≥ 1 giây giữa các câu và ≥ 2 giây giữa các đoạn. App tự nhận ra cả câu lẫn đoạn từ độ dài khoảng nghỉ.
6. Tốc độ giọng đọc là 1 cài đặt chung cho cả bài: học lần đầu 0,8×, thuộc rồi mới tăng dần.
7. Lưu trữ online: dùng tài khoản Supabase Sếp đã có.
8. Phase 1 làm nhanh nhất có thể để thử nút tai nghe trên điện thoại; không ổn thì đổi phương án ngay.

## Câu hỏi chưa giải quyết
Chưa có.
