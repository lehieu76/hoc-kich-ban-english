// Đọc kịch bản có mốc thời gian: mỗi đoạn bắt đầu bằng "mm:ss" (hoặc "h:mm:ss", "[mm:ss]", "mm:ss.s").
// Dòng không có mốc nằm sau 1 đoạn được nối vào đoạn đó. Dòng trước mốc đầu tiên = tiêu đề.
// Dòng "Slide 2 – THE DISCOVERY" mở 1 slide mới: các đoạn phía sau thuộc slide đó (paragraph.slide = số thứ tự slide).

const TIMESTAMP_LINE = /^\[?(?:(\d+):)?(\d{1,2}):(\d{2}(?:[.,]\d+)?)\]?\s*(.*)$/;
const SLIDE_LINE = /^slide\s*\d+\s*[–—:.-]?\s*(.*)$/i;

export function parseTimestampScript(text) {
  const titleLines = [];
  const paragraphs = [];
  const slides = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || /^[*=\-_]{3,}$/.test(line)) continue;
    const slideMatch = line.match(SLIDE_LINE);
    const match = line.match(TIMESTAMP_LINE);
    if (slideMatch) {
      slides.push({ title: slideMatch[1].trim() });
    } else if (match) {
      const [, hours = '0', minutes, seconds, rest] = match;
      const time = Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds.replace(',', '.'));
      paragraphs.push(slides.length ? { time, text: rest, slide: slides.length - 1 } : { time, text: rest });
    } else if (paragraphs.length) {
      paragraphs[paragraphs.length - 1].text += ` ${line}`;
    } else {
      titleLines.push(line);
    }
  }
  paragraphs.sort((a, b) => a.time - b.time);
  return { title: titleLines.join(' – ') || 'Bài học', paragraphs, slides };
}

// Mốc gõ tay chỉ chính xác tới giây → dời về sát điểm bắt đầu nói (cuối khoảng lặng gần nhất trong ±1,5 giây)
// để không bị mất chữ đầu đoạn hay dính đuôi đoạn trước.
export function snapParagraphsToPauses(paragraphs, pauses) {
  return paragraphs.map((paragraph) => {
    if (paragraph.time <= 0) return { ...paragraph, time: 0 };
    const nearby = pauses
      .filter((p) => p.end > paragraph.time - 1.5 && p.start < paragraph.time + 1.5)
      .sort((a, b) => b.duration - a.duration)[0];
    if (!nearby) return paragraph;
    return { ...paragraph, time: Math.max(nearby.start, nearby.end - 0.15) };
  });
}
