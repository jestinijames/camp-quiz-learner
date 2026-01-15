'use client';

import Link from 'next/link';
import { Moon, Sun, User, LogOut, Settings, UserCheck, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import Image from 'next/image';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

export default function Header() {
  const { user, logout, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering after client mount
  useEffect(() => {
    // Delay the state update to avoid cascading renders
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []); // Empty deps - only run once on mount

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Don't render if not mounted yet, or if loaded and no user
  if (!mounted) {
    return null;
  }

  if (!loading && !user) {
    return null;
  }

  return (
    <header className="flex justify-between items-center p-3 sm:p-4 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 relative">
      {/* Left side - Logo and Title */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        <Link 
          href={user?.isAdmin ? '/admin/dashboard' : '/'} 
          className="flex items-center space-x-2 sm:space-x-3 hover:opacity-80 transition-opacity group"
        >
          {/* Logo */}
          <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          
          {/* App Title - Responsive */}
          <div className="flex flex-col">
            <span className="text-lg sm:text-xl font-bold text-foreground leading-tight">
              <span className="hidden sm:inline">Camp Quiz Learner</span>
              <span className="sm:hidden">CQL</span>
            </span>
            {/* Subtitle - Only visible on larger screens */}
            <span className="hidden md:block text-xs text-muted-foreground leading-none">
              Bible Learning Made Fun
            </span>
          </div>
        </Link>

        {/* Team Badge - Mobile responsive */}
        {user && !user.isAdmin && user.team && (
          <Badge variant="outline" className="hidden xs:flex ml-2 text-xs items-center gap-1.5">
            {user.team.logo && (
              <div className="relative w-4 h-4 rounded-full overflow-hidden">
                <Image
                  src={user.team.logo}
                  alt={`${user.team.name} logo`}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <span className="hidden sm:inline">Team: </span>
            {user.team.name}
          </Badge>
        )}
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Mobile Team Badge - Show on very small screens */}
        {user && !user.isAdmin && user.team && (
          <Badge variant="outline" className="xs:hidden text-xs px-2 py-1 flex items-center gap-1">
            {user.team.logo && (
              <div className="relative w-3 h-3 rounded-full overflow-hidden">
                <Image
                  src={user.team.logo}
                  alt={`${user.team.name} logo`}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            {user.team.name}
          </Badge>
        )}

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
          className="h-8 w-8 sm:h-10 sm:w-10"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 sm:h-5 sm:w-5" />
          ) : (
            <Moon className="h-4 w-4 sm:h-5 sm:w-5" />
          )}
        </Button>

        {/* User Menu */}
        {user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-full">
              <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                <AvatarImage src="" alt={user.name} />
                <AvatarFallback className="text-xs sm:text-sm">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <div className="flex flex-col space-y-1 p-2">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              {!user.isAdmin && user.team && (
                <div className="flex items-center gap-1.5 text-xs leading-none text-muted-foreground">
                  {user.team.logo && (
                    <div className="relative w-3 h-3 rounded-full overflow-hidden">
                      <Image
                        src={user.team.logo}
                        alt={`${user.team.name} logo`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <span>Team: {user.team.name}</span>
                </div>
              )}
              {user.isAdmin && (
                <p className="text-xs leading-none text-muted-foreground">
                  Administrator
                </p>
              )}
            </div>
            <DropdownMenuSeparator />
            
            {user.isAdmin && (
              <>
                <DropdownMenuItem asChild>
                  <Link href="/admin/dashboard" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin/pending-members" className="flex items-center">
                    <UserCheck className="mr-2 h-4 w-4" />
                    Pending Approvals
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin/teams" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Manage Teams
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin/bible" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Manage Bible
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin/quiz/create" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Create Quiz
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            
            <DropdownMenuItem onClick={logout} className="flex items-center">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        )}
      </div>
    </header>
  );
}