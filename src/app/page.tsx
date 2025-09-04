"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Navbar } from "@/components/layout/navbar"
import { CommandSearch } from "@/components/layout/command-search"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { 
  Calendar, 
  Users, 
  Plus, 
  Filter,
  Search,
  MapPin,
  Clock,
  DollarSign,
  Trash2,
  MoreHorizontal
} from "lucide-react"
import { toast } from "sonner"

export default function HomePage() {
  const { data: session, status } = useSession()
  const [searchOpen, setSearchOpen] = useState(false)

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!session) {
    redirect("/signin")
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar onSearchOpen={() => setSearchOpen(true)} />
      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
      
      <main className="container mx-auto px-4 py-4 md:py-8 space-y-6 md:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Events Dashboard</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Manage your work-in-person events and shared expenses
            </p>
          </div>
          <Button size="lg" className="w-full sm:w-auto" asChild>
            <Link href="/events/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Event
            </Link>
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">
                Events you've attended
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total People</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">
                People you've shared events with
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Events Tabs */}
        <Tabs defaultValue="my-events" className="space-y-4 md:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:grid-cols-4">
              <TabsTrigger value="my-events" className="text-xs sm:text-sm">My Events</TabsTrigger>
              <TabsTrigger value="created" className="text-xs sm:text-sm">Created</TabsTrigger>
              <TabsTrigger value="current-wip" className="text-xs sm:text-sm">Current WIP</TabsTrigger>
              <TabsTrigger value="all" className="text-xs sm:text-sm">All Events</TabsTrigger>
            </TabsList>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                <Filter className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Filter</span>
              </Button>
              <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                <Search className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Search</span>
              </Button>
            </div>
          </div>

          <TabsContent value="my-events" className="space-y-4">
            <EventsList type="my-events" />
          </TabsContent>
          
          <TabsContent value="created" className="space-y-4">
            <EventsList type="created" />
          </TabsContent>
          
          <TabsContent value="current-wip" className="space-y-4">
            <EventsList type="current-wip" />
          </TabsContent>
          
          <TabsContent value="all" className="space-y-4">
            <EventsList type="all" />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

// Events List Component
function EventsList({ type }: { type: string }) {
  const { data: session } = useSession()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch(`/api/events?filter=${type}`)
        if (response.ok) {
          const data = await response.json()
          setEvents(data.events || [])
        }
      } catch (error) {
        console.error("Error fetching events:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [type])

  const handleDeleteEvent = async (eventId: string, eventTitle: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (errorData.canForceDelete) {
          const confirmForce = confirm(
            `This event has ${errorData.billCount} bill(s). Are you sure you want to delete it along with all bills and receipts? This action cannot be undone.`
          )
          if (confirmForce) {
            const forceResponse = await fetch(`/api/events/${eventId}?force=true`, {
              method: 'DELETE',
            })
            if (!forceResponse.ok) {
              throw new Error("Failed to delete event")
            }
          } else {
            return
          }
        } else {
          throw new Error(errorData.error || "Failed to delete event")
        }
      }

      // Remove from local state
      setEvents(prev => prev.filter((event: any) => event.id !== eventId))
      toast.success("Event deleted successfully!")
    } catch (error) {
      console.error("Error deleting event:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete event")
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-6 bg-muted rounded w-1/3"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                </div>
                <div className="h-8 bg-muted rounded w-20"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {events.map((event: any) => (
        <Card key={event.id} className="hover:shadow-md transition-shadow group">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <Link href={`/events/${event.id}`} className="flex-1 min-w-0">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-base sm:text-lg line-clamp-2 pr-2">{event.title}</h3>
                    {session?.user?.id === event.creatorId && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity shrink-0 h-8 w-8 p-0"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem 
                                className="text-destructive cursor-pointer"
                                onSelect={(e) => e.preventDefault()}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Event
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="max-w-[95vw] sm:max-w-lg">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Event</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{event.title}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteEvent(event.id, event.title)}
                                  className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete Event
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4 shrink-0" />
                      <span className="truncate">{new Date(event.date).toLocaleDateString()}</span>
                    </div>
                    {event.location && (
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4 shrink-0" />
                      <span>{event.attendeeCount || 0} attendees</span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    Created by {event.creator?.name || 'Unknown'}
                  </div>
                </div>
              </Link>
              
              {event.totalAmount > 0 && (
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start text-right space-y-0 sm:space-y-1 pt-2 sm:pt-0 border-t sm:border-t-0 sm:min-w-[120px]">
                  <div className="text-lg font-semibold">
                    ₹{(event.totalAmount / 100).toLocaleString('en-IN')}
                  </div>
                  {event.attendeeCount > 0 && (
                    <div className="text-sm text-muted-foreground">
                      ₹{Math.round(event.totalAmount / 100 / event.attendeeCount).toLocaleString('en-IN')} per person
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
      
      {events.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No events found</h3>
            <p className="text-muted-foreground mb-4">
              Create your first event to get started
            </p>
            <Button asChild>
              <Link href="/events/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Event
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}