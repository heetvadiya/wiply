"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
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
  Command,
  Menu,
  X
} from "lucide-react"
import { cn } from "@/lib/utils"

interface NavbarProps {
  onSearchOpen?: () => void
}

export function Navbar({ onSearchOpen }: NavbarProps) {
  const { data: session } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Calendar className="h-4 w-4" />
            </div>
            <span className="font-semibold text-lg">WIP Events</span>
          </Link>
          
          {/* Desktop Navigation */}
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

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center space-x-3">
          {/* Search */}
          <Button
            variant="outline"
            size="sm"
            onClick={onSearchOpen}
            className="relative w-48 justify-start text-sm text-muted-foreground"
          >
            <Search className="mr-2 h-4 w-4" />
            Search...
            <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 lg:flex">
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

        {/* Mobile Actions */}
        <div className="flex md:hidden items-center space-x-2">
          {/* Mobile Search */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onSearchOpen}
            className="p-2"
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="p-2">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              
              <div className="flex flex-col space-y-4 mt-6">
                {/* User Info */}
                {session?.user && (
                  <div className="flex items-center space-x-3 p-3 rounded-lg border">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={session.user.image || ""} alt={session.user.name || ""} />
                      <AvatarFallback>
                        {session.user.name?.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{session.user.name}</p>
                      <p className="text-xs text-muted-foreground">{session.user.email}</p>
                    </div>
                  </div>
                )}

                {/* Navigation Links */}
                <div className="space-y-2">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-left h-auto p-3" 
                    asChild
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link href="/">
                      <Calendar className="mr-3 h-5 w-5" />
                      Events
                    </Link>
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-left h-auto p-3" 
                    asChild
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link href="/people">
                      <Users className="mr-3 h-5 w-5" />
                      People
                    </Link>
                  </Button>

                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-left h-auto p-3" 
                    asChild
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link href="/admin">
                      <Settings className="mr-3 h-5 w-5" />
                      WIP Management
                    </Link>
                  </Button>
                </div>

                {/* Quick Actions */}
                <div className="space-y-2 pt-4 border-t">
                  <Button 
                    className="w-full" 
                    asChild
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link href="/events/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Event
                    </Link>
                  </Button>
                  
                  {session?.user && (
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => {
                        setMobileMenuOpen(false)
                        signOut({ callbackUrl: "/signin" })
                      }}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </Button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
