"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  Calendar, 
  Users, 
  Download, 
  Settings, 
  LogOut, 
  Plus,
  Search,
  Command
} from "lucide-react"
import { cn } from "@/lib/utils"

interface NavbarProps {
  onSearchOpen?: () => void
}

export function Navbar({ onSearchOpen }: NavbarProps) {
  const { data: session } = useSession()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo and Navigation */}
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Calendar className="h-4 w-4" />
            </div>
            <span className="font-semibold">WIP Events</span>
          </Link>
          
          <nav className="hidden md:flex items-center space-x-1">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <Calendar className="mr-2 h-4 w-4" />
                Events
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/people">
                <Users className="mr-2 h-4 w-4" />
                People
              </Link>
            </Button>
          </nav>
        </div>

        {/* Search and Actions */}
        <div className="flex items-center space-x-4">
          {/* Search */}
          <Button
            variant="outline"
            size="sm"
            onClick={onSearchOpen}
            className={cn(
              "relative w-48 justify-start text-sm text-muted-foreground",
              "hidden sm:flex"
            )}
          >
            <Search className="mr-2 h-4 w-4" />
            Search...
            <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              <Command className="h-3 w-3" />K
            </kbd>
          </Button>

          {/* Create Event */}
          <Button size="sm" asChild>
            <Link href="/events/new">
              <Plus className="mr-2 h-4 w-4" />
              New Event
            </Link>
          </Button>

          {/* User Menu */}
          {session?.user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session.user.image || ""} alt={session.user.name || ""} />
                    <AvatarFallback>
                      {session.user.name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {session.user.name}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {session.user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin">
                    <Settings className="mr-2 h-4 w-4" />
                    WIP Management
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/signin" })}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}
