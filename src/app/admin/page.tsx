"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Navbar } from "@/components/layout/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { 
  Plus, 
  Calendar, 
  Users, 
  Settings,
  Edit,
  Trash2
} from "lucide-react"
import { toast } from "sonner"

const wipWindowSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  isActive: z.boolean().optional(),
})

type WipWindowFormData = z.infer<typeof wipWindowSchema>

interface WipWindow {
  id: string
  name: string
  startDate: string
  endDate: string
  isActive: boolean
  eventCount: number
  participantCount: number
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const [wipWindows, setWipWindows] = useState<WipWindow[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingWindow, setEditingWindow] = useState<WipWindow | null>(null)

  const form = useForm<WipWindowFormData>({
    resolver: zodResolver(wipWindowSchema),
    defaultValues: {
      name: "",
      startDate: "",
      endDate: "",
      isActive: false,
    },
  })

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
    fetchWipWindows()
  }, [])

  const fetchWipWindows = async () => {
    try {
      const response = await fetch('/api/wip-windows')
      if (response.ok) {
        const data = await response.json()
        setWipWindows(data.wipWindows || [])
      }
    } catch (error) {
      console.error("Error fetching WIP windows:", error)
      toast.error("Failed to load WIP windows")
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: WipWindowFormData) => {
    try {
      const wipData = {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
      }

      const url = editingWindow ? `/api/wip-windows/${editingWindow.id}` : '/api/wip-windows'
      const method = editingWindow ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(wipData),
      })

      if (!response.ok) {
        throw new Error("Failed to save WIP window")
      }

      toast.success(editingWindow ? "WIP window updated!" : "WIP window created!")
      setDialogOpen(false)
      setEditingWindow(null)
      form.reset()
      fetchWipWindows()
    } catch (error) {
      console.error("Error saving WIP window:", error)
      toast.error("Failed to save WIP window")
    }
  }

  const handleEdit = (window: WipWindow) => {
    setEditingWindow(window)
    form.reset({
      name: window.name,
      startDate: new Date(window.startDate).toISOString().split('T')[0],
      endDate: new Date(window.endDate).toISOString().split('T')[0],
      isActive: window.isActive,
    })
    setDialogOpen(true)
  }

  const handleToggleActive = async (window: WipWindow) => {
    try {
      const response = await fetch(`/api/wip-windows/${window.id}`, {
        method: 'PATCH',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: !window.isActive }),
      })

      if (!response.ok) {
        throw new Error("Failed to update WIP window")
      }

      toast.success(window.isActive ? "WIP window deactivated" : "WIP window activated")
      fetchWipWindows()
    } catch (error) {
      console.error("Error toggling WIP window:", error)
      toast.error("Failed to update WIP window")
    }
  }

  const handleDeleteWipWindow = async (window: WipWindow, force = false) => {
    try {
      const url = `/api/wip-windows/${window.id}${force ? '?force=true' : ''}`
      const response = await fetch(url, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (errorData.canForceDelete && !force) {
          // Show confirmation for force delete
          const confirmForce = window.confirm(
            `This WIP window has ${errorData.eventCount} event(s). Are you sure you want to delete it along with all events, bills, and receipts? This action cannot be undone.`
          )
          if (confirmForce) {
            return handleDeleteWipWindow(window, true)
          }
          return
        }
        throw new Error(errorData.error || "Failed to delete WIP window")
      }

      toast.success("WIP window deleted successfully!")
      fetchWipWindows()
    } catch (error) {
      console.error("Error deleting WIP window:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete WIP window")
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">WIP Management</h1>
            <p className="text-muted-foreground">
              Manage Work-In-Person windows and settings
            </p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingWindow(null)
                form.reset({
                  name: "",
                  startDate: "",
                  endDate: "",
                  isActive: false,
                })
              }}>
                <Plus className="mr-2 h-4 w-4" />
                New WIP Window
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingWindow ? "Edit WIP Window" : "Create New WIP Window"}
                </DialogTitle>
                <DialogDescription>
                  Set up a new work-in-person period for your team
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., January 2024 WIP" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Active Window</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Make this the current active WIP window
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingWindow ? "Update" : "Create"} WIP Window
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* WIP Windows List */}
        <div className="space-y-4">
          {loading ? (
            <div className="grid gap-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="space-y-2">
                      <div className="h-6 bg-muted rounded w-1/3"></div>
                      <div className="h-4 bg-muted rounded w-2/3"></div>
                      <div className="h-4 bg-muted rounded w-1/4"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : wipWindows.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No WIP windows yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first WIP window to get started
                </p>
              </CardContent>
            </Card>
          ) : (
            wipWindows.map((window) => (
              <Card key={window.id} className={window.isActive ? "border-primary" : ""}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-lg">{window.name}</h3>
                        {window.isActive && (
                          <Badge variant="default">Active</Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {new Date(window.startDate).toLocaleDateString()} - {new Date(window.endDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>{window.eventCount} events</span>
                        <span>•</span>
                        <span>{window.participantCount} participants</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(window)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-destructive hover:text-destructive"
                            disabled={window.isActive}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete WIP Window</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{window.name}"? This action cannot be undone.
                              {window.eventCount > 0 && (
                                <span className="block mt-2 text-amber-600 font-medium">
                                  Warning: This WIP window has {window.eventCount} event(s) and {window.participantCount} participant(s).
                                </span>
                              )}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteWipWindow(window)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete WIP Window
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Switch
                        checked={window.isActive}
                        onCheckedChange={() => handleToggleActive(window)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
