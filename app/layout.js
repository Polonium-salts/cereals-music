import './globals.css';
import ThemeRegistry from './components/ThemeRegistry';

export const metadata = {
  title: 'MusicHub - 你的音乐世界',
  description: '多平台音乐资源整合，一站式音乐体验',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap"
        />
      </head>
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
