"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect, useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Navbar } from "@/components/layout/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { ArrowLeft, Calendar, MapPin, Users, Plus, X } from "lucide-react"
import Link from "next/link"

const eventSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"), 
  location: z.string().optional(),
  notes: z.string().optional(),
  wipWindowId: z.string().min(1, "WIP window is required"),
  attendeeEmails: z.array(z.string().email()).optional(),
})

type EventFormData = z.infer<typeof eventSchema>

export default function NewEventPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [attendeeInput, setAttendeeInput] = useState("")
  const [attendeeEmails, setAttendeeEmails] = useState<string[]>([])
  const [wipWindows, setWipWindows] = useState<Array<{ id: string; name: string; isActive: boolean; startDate: string; endDate: string }>>([])

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      date: "",
      time: "",
      location: "",
      notes: "",
      wipWindowId: "",
      attendeeEmails: [],
    },
  })

  useEffect(() => {
    const fetchWipWindows = async () => {
      try {
        const response = await fetch('/api/wip-windows')
        if (response.ok) {
          const data = await response.json()
          setWipWindows(data.wipWindows || [])
        }
      } catch (error) {
        console.error("Error fetching WIP windows:", error)
      }
    }

    fetchWipWindows()
  }, [])

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

  const addAttendee = () => {
    const email = attendeeInput.trim()
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !attendeeEmails.includes(email)) {
      setAttendeeEmails([...attendeeEmails, email])
      setAttendeeInput("")
    }
  }

  const removeAttendee = (email: string) => {
    setAttendeeEmails(attendeeEmails.filter(e => e !== email))
  }

  const onSubmit = async (data: EventFormData) => {
    setLoading(true)
    try {
      // Combine date and time
      const dateTime = new Date(`${data.date}T${data.time}`)
      
      const eventData = {
        ...data,
        date: dateTime.toISOString(),
        attendeeEmails,
      }

      console.log("Sending event data:", eventData) // Debug log

      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Server error response:", errorData)
        throw new Error(errorData.details || errorData.error || "Failed to create event")
      }

      const event = await response.json()
      toast.success("Event created successfully!")
      router.push(`/events/${event.id}`)
    } catch (error) {
      console.error("Error creating event:", error)
      toast.error(error instanceof Error ? error.message : "Failed to create event. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Create New Event</h1>
            <p className="text-muted-foreground">
              Organize a group outing during your WIP window
            </p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Event Details</span>
                </CardTitle>
                <CardDescription>
                  Fill in the basic information about your event
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Title */}
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Team dinner, coffee meetup, activity..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Date and Time */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Time</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* WIP Window */}
                    <FormField
                      control={form.control}
                      name="wipWindowId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>WIP Window</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select WIP window" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {wipWindows.length === 0 ? (
                                <SelectItem value="no-windows" disabled>No WIP windows available</SelectItem>
                              ) : (
                                wipWindows.map((window) => (
                                  <SelectItem key={window.id} value={window.id}>
                                    {window.name} ({new Date(window.startDate).toLocaleDateString()} - {new Date(window.endDate).toLocaleDateString()})
                                    {window.isActive && " (Active)"}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Choose the WIP window this event belongs to
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Location */}
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Restaurant, office, address..."
                              {...field}
                              className="pr-10"
                            />
                          </FormControl>
                          <FormDescription>
                            Where is this event taking place?
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Notes */}
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Any additional details about the event..."
                              className="resize-none"
                              rows={3}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Submit Button */}
                    <div className="flex justify-end space-x-4">
                      <Button variant="outline" type="button" asChild>
                        <Link href="/">Cancel</Link>
                      </Button>
                      <Button type="submit" disabled={loading}>
                        {loading && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        )}
                        Create Event
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Attendees Sidebar */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Invite Attendees</span>
                </CardTitle>
                <CardDescription>
                  Add people you&apos;d like to invite to this event
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Attendee Input */}
                <div className="flex space-x-2">
                  <Input
                    placeholder="colleague@company.com"
                    value={attendeeInput}
                    onChange={(e) => setAttendeeInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addAttendee()
                      }
                    }}
                  />
                  <Button 
                    type="button" 
                    size="sm" 
                    onClick={addAttendee}
                    disabled={!attendeeInput.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Attendee List */}
                <div className="space-y-2">
                  {attendeeEmails.map((email) => (
                    <div
                      key={email}
                      className="flex items-center justify-between p-2 bg-muted rounded-md"
                    >
                      <span className="text-sm">{email}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttendee(email)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  {attendeeEmails.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No attendees added yet
                    </p>
                  )}
                </div>

                {attendeeEmails.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">
                      {attendeeEmails.length} attendee{attendeeEmails.length !== 1 ? "s" : ""} will be invited
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
