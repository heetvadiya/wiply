"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { CommandSearch } from "@/components/layout/command-search"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Calendar, 
  Users, 
  Plus, 
  Filter,
  Search,
  MapPin,
  Clock,
  DollarSign
} from "lucide-react"

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
              Manage your work-in-person events and reimbursements
            </p>
          </div>
          <Button size="lg" className="hidden sm:flex">
            <Plus className="mr-2 h-4 w-4" />
            Create Event
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">
                +2 from last VIP window
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Attendees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">127</div>
              <p className="text-xs text-muted-foreground">
                Across all events
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Reimbursements</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$1,247</div>
              <p className="text-xs text-muted-foreground">
                Ready for export
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
              <TabsTrigger value="current-vip">Current VIP</TabsTrigger>
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
          
          <TabsContent value="current-vip" className="space-y-4">
            <EventsList type="current-vip" />
          </TabsContent>
          
          <TabsContent value="all" className="space-y-4">
            <EventsList type="all" />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

// Mock Events List Component
function EventsList({ type }: { type: string }) {
  // This would normally fetch real data based on type
  const mockEvents = [
    {
      id: "1",
      title: "Team Dinner at Nobu",
      date: "2024-01-15T19:00:00Z",
      location: "Nobu Downtown",
      attendeeCount: 8,
      total: 450.00,
      status: "confirmed",
      creator: "Alice Smith"
    },
    {
      id: "2", 
      title: "Coffee & Planning Session",
      date: "2024-01-16T09:00:00Z",
      location: "Blue Bottle Coffee",
      attendeeCount: 4,
      total: 28.50,
      status: "pending",
      creator: "Bob Johnson"
    },
    {
      id: "3",
      title: "Escape Room Team Building",
      date: "2024-01-17T15:00:00Z", 
      location: "Escape the Room NYC",
      attendeeCount: 12,
      total: 240.00,
      status: "confirmed",
      creator: "You"
    }
  ]

  return (
    <div className="space-y-4">
      {mockEvents.map((event) => (
        <Card key={event.id} className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-lg">{event.title}</h3>
                  <Badge variant={event.status === "confirmed" ? "default" : "secondary"}>
                    {event.status}
                  </Badge>
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{new Date(event.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>{event.location}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>{event.attendeeCount} attendees</span>
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  Created by {event.creator}
                </div>
              </div>
              
              <div className="text-right space-y-1">
                <div className="text-lg font-semibold">
                  ${event.total.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">
                  ${(event.total / event.attendeeCount).toFixed(2)} per person
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {mockEvents.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No events found</h3>
            <p className="text-muted-foreground mb-4">
              Create your first event to get started
            </p>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Event
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}