"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { CommandSearch } from "@/components/layout/command-search"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Users, Search, Calendar, DollarSign } from "lucide-react"

interface Person {
  id: string
  name: string
  email: string
  image?: string
  eventCount: number
  totalSpent: number
  totalOwed: number
}

export default function PeoplePage() {
  const { data: session, status } = useSession()
  const [searchOpen, setSearchOpen] = useState(false)
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

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

  useEffect(() => {
    const fetchPeople = async () => {
      try {
        const response = await fetch('/api/people')
        if (response.ok) {
          const data = await response.json()
          setPeople(data.people || [])
        }
      } catch (error) {
        console.error("Error fetching people:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPeople()
  }, [])

  const filteredPeople = people.filter(person =>
    person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-background">
      <Navbar onSearchOpen={() => setSearchOpen(true)} />
      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
      
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">People Directory</h1>
            <p className="text-muted-foreground">
              See who's participating in WIP events and their activity
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total People</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{people.length}</div>
              <p className="text-xs text-muted-foreground">
                Active in current WIP
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {people.reduce((sum, person) => sum + person.eventCount, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all participants
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spending</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{people.reduce((sum, person) => sum + person.totalSpent, 0).toLocaleString('en-IN')}
              </div>
              <p className="text-xs text-muted-foreground">
                Current WIP window
              </p>
            </CardContent>
          </Card>
        </div>

        {/* People Grid */}
        <div className="space-y-4">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-muted rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                        <div className="h-3 bg-muted rounded w-2/3" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredPeople.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {searchQuery ? "No people found" : "No people yet"}
                </h3>
                <p className="text-muted-foreground">
                  {searchQuery 
                    ? "Try adjusting your search query" 
                    : "People will appear here when they join events"
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPeople.map((person) => (
                <Card key={person.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={person.image} alt={person.name} />
                        <AvatarFallback>{person.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 space-y-2">
                        <div>
                          <h3 className="font-medium">{person.name}</h3>
                          <p className="text-sm text-muted-foreground">{person.email}</p>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Events attended:</span>
                            <Badge variant="secondary">{person.eventCount}</Badge>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Total spent:</span>
                            <span className="font-medium">₹{person.totalSpent.toLocaleString('en-IN')}</span>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Amount owed:</span>
                            <span className="font-medium text-amber-600">
                              ₹{person.totalOwed.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
