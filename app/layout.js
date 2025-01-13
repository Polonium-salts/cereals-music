import './globals.css';

export const metadata = {
  title: 'Cereals Music - 你的音乐世界',
  description: '多平台音乐资源整合，一站式音乐体验',
};

import ClientLayout from './ClientLayout';
import { PlayerProvider } from './contexts/PlayerContext';

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
        <PlayerProvider>
          <ClientLayout>{children}</ClientLayout>
        </PlayerProvider>
      </body>
    </html>
  );
}
