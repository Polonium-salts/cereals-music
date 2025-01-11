'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Home as HomeIcon, 
  LibraryMusic, 
  Person, 
  Album, 
  Favorite, 
  PlaylistPlay, 
  History,
  ChevronLeft,
  ChevronRight,
  Settings,
  Menu as MenuIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { IconButton, Tooltip } from '@mui/material';
import { useTheme } from '../contexts/ThemeContext';

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { isDarkMode } = useTheme();
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 1024;

  // 从本地存储加载侧边栏状态
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarState');
    if (savedState) {
      setIsCollapsed(savedState === 'collapsed');
    }
  }, []);

  // 保存侧边栏状态到本地存储
  useEffect(() => {
    localStorage.setItem('sidebarState', isCollapsed ? 'collapsed' : 'expanded');
  }, [isCollapsed]);

  // 监听路由变化，在移动端自动关闭侧边栏
  useEffect(() => {
    if (isMobile) {
      setIsMobileOpen(false);
    }
  }, [pathname, isMobile]);

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) {
        setIsMobileOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const mainNavItems = [
    { icon: <HomeIcon />, label: '发现音乐', path: '/' },
    { icon: <LibraryMusic />, label: '歌单广场', path: '/playlists' },
    { icon: <Album />, label: '新碟上架', path: '/albums' },
  ];

  const personalNavItems = [
    { icon: <Favorite />, label: '我喜欢的', path: '/my/likes' },
    { icon: <PlaylistPlay />, label: '我的歌单', path: '/my/playlists' },
    { icon: <History />, label: '最近播放', path: '/my/history' },
    { icon: <Settings />, label: '设置', path: '/settings' },
  ];

  const toggleCollapse = () => {
    setIsCollapsed(prev => !prev);
  };

  const toggleMobileSidebar = () => {
    setIsMobileOpen(prev => !prev);
  };

  const renderNavItem = (item) => {
    const isActive = pathname === item.path;
    return (
      <Tooltip 
        key={item.path} 
        title={isCollapsed && !isMobile ? item.label : ''} 
        placement="right"
      >
        <Link
          href={item.path}
          className={`nav-item ${isActive ? 'active' : ''} ${isCollapsed && !isMobile ? 'collapsed' : ''}`}
        >
          <span className="nav-icon">{item.icon}</span>
          {(!isCollapsed || isMobile) && <span className="nav-label">{item.label}</span>}
        </Link>
      </Tooltip>
    );
  };

  return (
    <>
      {/* 移动端菜单按钮 */}
      <IconButton
        className="mobile-menu-btn"
        onClick={toggleMobileSidebar}
        size="large"
      >
        {isMobileOpen ? <CloseIcon /> : <MenuIcon />}
      </IconButton>

      {/* 移动端遮罩层 */}
      {isMobileOpen && (
        <div className="sidebar-overlay" onClick={() => setIsMobileOpen(false)} />
      )}

      <aside className={`sidebar ${isCollapsed && !isMobile ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <Link href="/" className="logo">
            <LibraryMusic className="logo-icon" />
            {(!isCollapsed || isMobile) && <span>Cereals Music</span>}
          </Link>
        </div>

        <div className="nav-section">
          <div className="nav-section-header">
            {(!isCollapsed || isMobile) && <h3 className="nav-title">音乐馆</h3>}
            {!isMobile && (
              <IconButton 
                className="collapse-btn"
                onClick={toggleCollapse}
                size="small"
              >
                {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
              </IconButton>
            )}
          </div>
          <nav className="nav-list">
            {mainNavItems.map(renderNavItem)}
          </nav>
        </div>

        <div className="nav-section">
          {(!isCollapsed || isMobile) && <h3 className="nav-title">我的音乐</h3>}
          <nav className="nav-list">
            {personalNavItems.map(renderNavItem)}
          </nav>
        </div>

        <div className="sidebar-footer">
          <Link href="/my/profile" className="user-profile">
            <Person className="avatar-icon" />
            {(!isCollapsed || isMobile) && <span>我的主页</span>}
          </Link>
        </div>
      </aside>
    </>
  );
} 