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
      
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Events Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your work-in-person events and shared expenses
            </p>
          </div>
          <Button size="lg" className="hidden sm:flex" asChild>
            <Link href="/events/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Event
            </Link>
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-6 md:grid-cols-2">
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
        <Tabs defaultValue="my-events" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="my-events">My Events</TabsTrigger>
              <TabsTrigger value="created">Created by Me</TabsTrigger>
              <TabsTrigger value="current-wip">Current WIP</TabsTrigger>
              <TabsTrigger value="all">All Events</TabsTrigger>
            </TabsList>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <Search className="mr-2 h-4 w-4" />
                Search
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
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <Link href={`/events/${event.id}`} className="flex-1">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-lg">{event.title}</h3>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{new Date(event.date).toLocaleDateString()}</span>
                    </div>
                    {event.location && (
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-4 w-4" />
                        <span>{event.location}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>{event.attendeeCount || 0} attendees</span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    Created by {event.creator?.name || 'Unknown'}
                  </div>
                </div>
              </Link>
              
              <div className="flex items-center space-x-2">
                {event.totalAmount > 0 && (
                  <div className="text-right space-y-1 mr-2">
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
                
                {session?.user?.id === event.creatorId && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
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
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Event</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{event.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteEvent(event.id, event.title)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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