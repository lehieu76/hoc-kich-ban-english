// Tạo lesson.json cho 1 bài từ audio.mp3 + script.txt (dòng "mm:ss nội dung đoạn"),
// dời mốc về đúng điểm bắt đầu nói, rồi cập nhật danh sách bài app/lessons/index.json.
// Dùng: npm run build-lesson -- <thư-mục-bài>   (ví dụ app/lessons/alexander-fleming)
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { MPEGDecoder } from 'mpg123-decoder';
import { parseTimestampScript, snapParagraphsToPauses } from '../app/timestamp-script-parser.js';
import { findPauses } from '../app/silence-segmenter.js';

const lessonDir = process.argv[2];
if (!lessonDir) throw new Error('Thiếu thư mục bài, ví dụ: npm run build-lesson -- app/lessons/alexander-fleming');

const decoder = new MPEGDecoder();
await decoder.ready;
const { channelData, sampleRate } = decoder.decode(new Uint8Array(readFileSync(join(lessonDir, 'audio.mp3'))));
const { title, paragraphs, slides } = parseTimestampScript(readFileSync(join(lessonDir, 'script.txt'), 'utf8'));
const snapped = snapParagraphsToPauses(paragraphs, findPauses(channelData[0], sampleRate))
  .map((p) => ({ time: Math.round(p.time * 100) / 100, text: p.text, slide: p.slide }));
writeFileSync(join(lessonDir, 'lesson.json'), JSON.stringify({ title, audio: 'audio.mp3', slides, paragraphs: snapped }, null, 2));
console.log(`${basename(lessonDir)}: ${slides.length} slide, ${snapped.length} đoạn, ${(channelData[0].length / sampleRate).toFixed(1)}s`);

// Bài vừa build đứng đầu danh sách (app mở bài đầu tiên khi có bài mới), các bài khác giữ thứ tự cũ.
const lessonsRoot = join(lessonDir, '..');
const indexPath = join(lessonsRoot, 'index.json');
const oldOrder = existsSync(indexPath) ? JSON.parse(readFileSync(indexPath, 'utf8')).map((l) => l.id) : [];
const rank = (id) => (id === basename(lessonDir) ? -1 : oldOrder.includes(id) ? oldOrder.indexOf(id) : oldOrder.length);
const index = readdirSync(lessonsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(lessonsRoot, entry.name, 'lesson.json')))
  .map((entry) => ({ id: entry.name, title: JSON.parse(readFileSync(join(lessonsRoot, entry.name, 'lesson.json'), 'utf8')).title }))
  .sort((a, b) => rank(a.id) - rank(b.id));
writeFileSync(indexPath, JSON.stringify(index, null, 2));
console.log(`index.json: ${index.length} bài`);
