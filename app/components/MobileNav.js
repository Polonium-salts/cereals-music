'use client';

import { 
  Home as HomeIcon,
  Search,
  LibraryMusic,
  Person,
  Favorite
} from '@mui/icons-material';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    { icon: <HomeIcon />, label: '发现', path: '/' },
    { icon: <Search />, label: '搜索', path: '/search' },
    { icon: <Favorite />, label: '收藏', path: '/my/likes' },
    { icon: <Person />, label: '我的', path: '/my/profile' },
  ];

  return (
    <nav className="mobile-nav">
      <div className="mobile-nav-content">
        {navItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`mobile-nav-item ${pathname === item.path ? 'active' : ''}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
} 