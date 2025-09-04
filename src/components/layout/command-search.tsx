"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import {
  Calendar,
  Users,
  MapPin,
  Clock,
  User
} from "lucide-react"

interface SearchResult {
  id: string
  type: "event" | "person"
  title: string
  subtitle?: string
  date?: string
  location?: string
  href: string
}

interface CommandSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandSearch({ open, onOpenChange }: CommandSearchProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [open, onOpenChange])

  useEffect(() => {
    if (!search) {
      setResults([])
      return
    }

    const searchResults = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(search)}`)
        if (response.ok) {
          const data = await response.json()
          setResults(data.results || [])
        }
      } catch (error) {
        console.error("Search error:", error)
      } finally {
        setLoading(false)
      }
    }

    const debounce = setTimeout(searchResults, 300)
    return () => clearTimeout(debounce)
  }, [search])

  const onSelect = (href: string) => {
    onOpenChange(false)
    router.push(href)
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search events, people..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>
          {loading ? "Searching..." : "No results found."}
        </CommandEmpty>
        {results.length > 0 && (
          <>
            <CommandGroup heading="Events">
              {results
                .filter(result => result.type === "event")
                .map(result => (
                  <CommandItem
                    key={result.id}
                    onSelect={() => onSelect(result.href)}
                    className="flex items-center space-x-3"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {result.title}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        {result.date && (
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{result.date}</span>
                          </div>
                        )}
                        {result.location && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3" />
                            <span>{result.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
            </CommandGroup>
            <CommandGroup heading="People">
              {results
                .filter(result => result.type === "person")
                .map(result => (
                  <CommandItem
                    key={result.id}
                    onSelect={() => onSelect(result.href)}
                    className="flex items-center space-x-3"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {result.title}
                      </p>
                      {result.subtitle && (
                        <p className="text-xs text-muted-foreground">
                          {result.subtitle}
                        </p>
                      )}
                    </div>
                  </CommandItem>
                ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
