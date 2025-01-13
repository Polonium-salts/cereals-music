export function formatDuration(ms) {
  if (!ms) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatNumber(num) {
  if (!num) return '0';
  if (num < 10000) return num.toString();
  if (num < 100000000) return Math.floor(num / 10000) + '万';
  return Math.floor(num / 100000000) + '亿';
} 