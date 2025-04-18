import { Link } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/auth-context";
import ShiftStatus from "./shift-status";

interface HeaderProps {
  title: string;
  toggleMobileNav?: () => void;
}

export default function Header({ title, toggleMobileNav }: HeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-sm p-4 flex items-center justify-between">
      <div className="flex items-center">
        {toggleMobileNav && (
          <button className="md:hidden mr-2" onClick={toggleMobileNav}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>

      <div className="flex items-center space-x-3">
        {/* Shift Status Component */}
        <div className="mr-2">
          <ShiftStatus />
        </div>
        
        <div className="relative">
          <button className="p-1 text-gray-500 hover:text-primary focus:outline-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">3</span>
          </button>
        </div>
        <div>
          <button className="p-1 text-gray-500 hover:text-primary focus:outline-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
        </div>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 text-gray-500 hover:text-primary focus:outline-none flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="ml-2 hidden md:inline-block">{user?.displayName || "User"}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {user && (
              <>
                <div className="px-2 py-1.5 text-sm">
                  <div className="font-medium">{user.displayName}</div>
                  <div className="text-xs text-muted-foreground">{user.email || user.username}</div>
                  <div className="text-xs text-muted-foreground capitalize mt-1">Role: {user.role}</div>
                </div>
                <DropdownMenuSeparator />
              </>
            )}

            <Link href="/settings">
              <DropdownMenuItem className="cursor-pointer">
                Settings
              </DropdownMenuItem>
            </Link>
            
            <Link href="/shift-management">
              <DropdownMenuItem className="cursor-pointer">
                Shift Management
              </DropdownMenuItem>
            </Link>

            <DropdownMenuItem className="cursor-pointer" onClick={logout}>
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
