"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect, useParams, useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Navbar } from "@/components/layout/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Users, 
  Plus, 
  Edit,
  Receipt,
  Download,
  Check,
  X,
  Trash2
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

const billSchema = z.object({
  notes: z.string().optional(),
  files: z.array(z.object({
    name: z.string(),
    url: z.string(),
    size: z.number(),
  })).min(1, "At least one receipt file is required"),
})

type BillFormData = z.infer<typeof billSchema>

interface Event {
  id: string
  title: string
  date: string
  location?: string
  notes?: string
  creator: {
    id: string
    name: string
    email: string
    image?: string
  }
  paidBy?: {
    id: string
    name: string
    email: string
    image?: string
  }
  attendances: Array<{
    id: string
    status: "PROPOSED" | "CONFIRMED" | "DECLINED"
    email: string
    isPaid?: boolean
    user?: {
      id: string
      name: string
      email: string
      image?: string
    }
    paidBy?: {
      id: string
      name: string
      email: string
    }
  }>
  bills: Array<{
    id: string
    totalCents: number
    currency: string
    notes?: string
    payer: {
      id: string
      name: string
    }
    attachments: Array<{
      id: string
      fileName: string
      url: string
    }>
  }>
}

export default function EventDetailPage() {
  const { data: session, status } = useSession()
  const params = useParams()
  const router = useRouter()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [billDialogOpen, setBillDialogOpen] = useState(false)
  const [billLoading, setBillLoading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<Array<{name: string, url: string, size: number}>>([])
  const [paidByLoading, setPaidByLoading] = useState(false)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [attendeeInput, setAttendeeInput] = useState("")
  const [newAttendeeEmails, setNewAttendeeEmails] = useState<string[]>([])
  const [inviteLoading, setInviteLoading] = useState(false)

  const billForm = useForm<BillFormData>({
    resolver: zodResolver(billSchema),
    defaultValues: {
      notes: "",
      files: [],
    },
  })

  // Move useEffect before conditional returns
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await fetch(`/api/events/${params.id}`)
        if (!response.ok) {
          throw new Error("Failed to fetch event")
        }
        const eventData = await response.json()
        setEvent(eventData)
      } catch (error) {
        console.error("Error fetching event:", error)
        toast.error("Failed to load event")
        router.push("/")
      } finally {
        setLoading(false)
      }
    }

    if (params.id && session) {
      fetchEvent()
    }
  }, [params.id, router, session])

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

  const handleAttendanceResponse = async (attendanceId: string, status: "CONFIRMED" | "DECLINED") => {
    try {
      const response = await fetch(`/api/attendances/${attendanceId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        throw new Error("Failed to update attendance")
      }

      // Update local state
      setEvent(prev => {
        if (!prev) return prev
        return {
          ...prev,
          attendances: prev.attendances.map((attendance: any) =>
            attendance.id === attendanceId
              ? { ...attendance, status }
              : attendance
          )
        }
      })

      toast.success(`Attendance ${status.toLowerCase()}`)
    } catch (error) {
      console.error("Error updating attendance:", error)
      toast.error("Failed to update attendance")
    }
  }

  const handleDownloadBills = async () => {
    if (!event) return

    try {
      const response = await fetch(`/api/events/${event.id}/download-bills`)
      if (!response.ok) {
        throw new Error("Failed to download bills")
      }

      // Get the filename from the response headers
      const contentDisposition = response.headers.get('content-disposition')
      const filename = contentDisposition?.split('filename=')[1]?.replace(/"/g, '') || 'bills.zip'

      // Create blob and download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success("Bills downloaded successfully!")
    } catch (error) {
      console.error("Error downloading bills:", error)
      toast.error("Failed to download bills")
    }
  }

  const handleDeleteEvent = async (force = false) => {
    if (!event) return

    try {
      const url = `/api/events/${event.id}${force ? '?force=true' : ''}`
      const response = await fetch(url, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (errorData.canForceDelete && !force) {
          // Show confirmation for force delete
          const confirmForce = window.confirm(
            `This event has ${errorData.billCount} bill(s). Are you sure you want to delete it along with all bills and receipts? This action cannot be undone.`
          )
          if (confirmForce) {
            return handleDeleteEvent(true)
          }
          return
        }
        throw new Error(errorData.error || "Failed to delete event")
      }

      toast.success("Event deleted successfully!")
      router.push("/")
    } catch (error) {
      console.error("Error deleting event:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete event")
    }
  }

  const handleCreateBill = async (data: BillFormData) => {
    if (!event) return

    try {
      setBillLoading(true)

      const billData = {
        notes: data.notes,
        files: uploadedFiles,
      }

      const response = await fetch(`/api/events/${event.id}/bills`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(billData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create bill")
      }

      const newBill = await response.json()
      
      // Update event state with new bill
      setEvent(prev => {
        if (!prev) return prev
        return {
          ...prev,
          bills: [...prev.bills, newBill]
        }
      })

      toast.success("Receipt uploaded successfully!")
      setBillDialogOpen(false)
      billForm.reset()
      setUploadedFiles([])
    } catch (error) {
      console.error("Error uploading receipt:", error)
      toast.error(error instanceof Error ? error.message : "Failed to upload receipt")
    } finally {
      setBillLoading(false)
    }
  }

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return

    const fileArray = Array.from(files)
    const maxSize = 10 * 1024 * 1024 // 10MB
    
    const validFiles = fileArray.filter((file: File) => {
      if (file.size > maxSize) {
        toast.error(`File ${file.name} is too large. Max size is 10MB.`)
        return false
      }
      
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
      if (!validTypes.includes(file.type)) {
        toast.error(`File ${file.name} is not a valid type. Only JPG, PNG, and PDF files are allowed.`)
        return false
      }
      
      return true
    })

    if (validFiles.length === 0) return

    // Convert files to base64 for now (in production, you'd upload to a cloud service)
    const newFiles: Array<{name: string, url: string, size: number}> = []
    
    validFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          newFiles.push({
            name: file.name,
            url: e.target.result as string,
            size: file.size,
          })
          
          if (newFiles.length === validFiles.length) {
            setUploadedFiles(prev => [...prev, ...newFiles])
            billForm.setValue('files', [...uploadedFiles, ...newFiles])
          }
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const handleDownloadReceipt = (bill: { attachments?: Array<{ url: string; fileName: string }> }) => {
    if (bill.attachments && bill.attachments.length > 0) {
      bill.attachments.forEach((attachment) => {
        // For base64 files, create a download link
        const link = document.createElement('a')
        link.href = attachment.url
        link.download = attachment.fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      })
      toast.success("Receipt downloaded!")
    } else {
      toast.error("No attachments found")
    }
  }

  const handleDeleteReceipt = async (billId: string) => {
    if (!event) return

    const confirmed = confirm("Are you sure you want to delete this receipt? This action cannot be undone.")
    if (!confirmed) return

    try {
      const response = await fetch(`/api/events/${event.id}/bills/${billId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error("Failed to delete receipt")
      }

      // Update event state to remove the deleted bill
      setEvent(prev => {
        if (!prev) return prev
        return {
          ...prev,
          bills: prev.bills.filter((bill: any) => bill.id !== billId)
        }
      })

      toast.success("Receipt deleted successfully!")
    } catch (error) {
      console.error("Error deleting receipt:", error)
      toast.error("Failed to delete receipt")
    }
  }

  const handleUpdatePaidBy = async (userId: string | null) => {
    if (!event) return

    try {
      setPaidByLoading(true)

      const response = await fetch(`/api/events/${event.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paidById: userId }),
      })

      if (!response.ok) {
        throw new Error("Failed to update paid by")
      }

      const updatedEvent = await response.json()
      setEvent(updatedEvent)
      toast.success("Paid by updated successfully!")
    } catch (error) {
      console.error("Error updating paid by:", error)
      toast.error("Failed to update paid by")
    } finally {
      setPaidByLoading(false)
    }
  }

  const addNewAttendee = () => {
    const email = attendeeInput.trim()
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !newAttendeeEmails.includes(email)) {
      // Check if email is already in existing attendances
      const existingEmails = event?.attendances.map((a: any) => a.email) || []
      if (!existingEmails.includes(email)) {
        setNewAttendeeEmails([...newAttendeeEmails, email])
        setAttendeeInput("")
      } else {
        toast.error("This person is already invited to the event")
      }
    } else if (newAttendeeEmails.includes(email)) {
      toast.error("This email is already in the invite list")
    } else {
      toast.error("Please enter a valid email address")
    }
  }

  const removeNewAttendee = (email: string) => {
    setNewAttendeeEmails(newAttendeeEmails.filter((e: string) => e !== email))
  }

  const handleInviteAttendees = async () => {
    if (!event || newAttendeeEmails.length === 0) return

    setInviteLoading(true)

    try {
      const response = await fetch(`/api/events/${event.id}/attendees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendeeEmails: newAttendeeEmails,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to invite attendees")
      }

      await response.json()
      
      // Refresh event data to show new attendees
      const eventResponse = await fetch(`/api/events/${params.id}`)
      if (eventResponse.ok) {
        const eventData = await eventResponse.json()
        setEvent(eventData)
      }

      toast.success(`Successfully invited ${newAttendeeEmails.length} people!`)
      setNewAttendeeEmails([])
      setAttendeeInput("")
      setInviteDialogOpen(false)
    } catch (error) {
      console.error("Error inviting attendees:", error)
      toast.error("Failed to invite attendees")
    } finally {
      setInviteLoading(false)
    }
  }

  const handleUpdateAttendancePaidStatus = async (attendanceId: string, isPaid: boolean, paidById?: string) => {
    if (!event) return

    try {
      const response = await fetch(`/api/events/${event.id}/attendees`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendanceId,
          isPaid,
          paidById,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update payment status")
      }

      // Refresh event data
      const eventResponse = await fetch(`/api/events/${params.id}`)
      if (eventResponse.ok) {
        const eventData = await eventResponse.json()
        setEvent(eventData)
      }

      toast.success(`Payment status updated!`)
    } catch (error) {
      console.error("Error updating payment status:", error)
      toast.error("Failed to update payment status")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </main>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Event not found</h1>
            <Button asChild>
              <Link href="/">Back to Dashboard</Link>
            </Button>
          </div>
        </main>
      </div>
    )
  }

  const confirmedAttendees = event.attendances.filter((a: any) => a.status === "CONFIRMED" && a.user)
  const totalBillAmount = event.bills.reduce((sum, bill) => sum + bill.totalCents, 0)
  const perPersonAmount = confirmedAttendees.length > 0 ? totalBillAmount / confirmedAttendees.length : 0
  const isCreator = event.creator.id === session.user.id
  const myAttendance = event.attendances.find(a => a.user?.id === session.user.id)

  // Debug logging (remove after testing)
  // console.log("Event creator ID:", event.creator.id)
  // console.log("Session user ID:", session.user.id)
  // console.log("Is creator:", isCreator)
  // console.log("My attendance:", myAttendance)

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-4 md:py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-6 md:mb-8">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </Button>
        </div>

        {/* Event Header */}
        <div className="space-y-4 md:space-y-6 mb-6 md:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="space-y-3 md:space-y-4 flex-1 min-w-0">
              <div className="space-y-2">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight line-clamp-2">{event.title}</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4 text-sm md:text-base text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span className="truncate">{new Date(event.date).toLocaleString()}</span>
                  </div>
                  {event.location && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 shrink-0" />
                    <span>{confirmedAttendees.length} confirmed</span>
                  </div>
                </div>
              </div>
              
              {event.notes && (
                <p className="text-muted-foreground">{event.notes}</p>
              )}
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">Created by</span>
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={event.creator.image} />
                    <AvatarFallback>{event.creator.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{event.creator.name}</span>
                </div>
                
                {/* Paid by field - editable by any attendee */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">Paid by</span>
                  <Select
                    value={event.paidBy?.id || "none"}
                    onValueChange={(value) => handleUpdatePaidBy(value === "none" ? null : value)}
                    disabled={paidByLoading}
                  >
                    <SelectTrigger className="w-auto min-w-[150px] h-8">
                      <SelectValue placeholder="Select who paid" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No one selected</SelectItem>
                      {confirmedAttendees.map((attendance) => (
                        <SelectItem key={attendance.user!.id} value={attendance.user!.id}>
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-4 w-4">
                              <AvatarImage src={attendance.user!.image} />
                              <AvatarFallback className="text-xs">
                                {attendance.user!.name?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{attendance.user!.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {paidByLoading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {totalBillAmount > 0 && (
                <div className="text-right">
                  <div className="text-2xl font-bold">${(totalBillAmount / 100).toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">
                    ${(perPersonAmount / 100).toFixed(2)} per person
                  </div>
                </div>
              )}
              
              {isCreator && (
                <div className="flex space-x-2">
                  <Button variant="outline">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Event
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Event</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete &quot;{event.title}&quot;? This action cannot be undone.
                          {event.bills && event.bills.length > 0 && (
                            <span className="block mt-2 text-amber-600 font-medium">
                              Warning: This event has {event.bills.length} bill(s) attached.
                            </span>
                          )}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDeleteEvent()}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete Event
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Attendance Response (if user is invited) */}
            {myAttendance && myAttendance.status === "PROPOSED" && (
              <Card className="border-amber-200 bg-amber-50/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">You&apos;re invited to this event</h3>
                      <p className="text-sm text-muted-foreground">
                        Please confirm your attendance
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleAttendanceResponse(myAttendance.id, "CONFIRMED")}
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Confirm
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleAttendanceResponse(myAttendance.id, "DECLINED")}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Decline
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bills Tab */}
            <Tabs defaultValue="bills" className="w-full">
              <TabsList>
                <TabsTrigger value="bills">Bills & Receipts</TabsTrigger>
                <TabsTrigger value="splits">Bill Sharing</TabsTrigger>
              </TabsList>
              
              <TabsContent value="bills" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Bills & Receipts</h3>
                  {(isCreator || myAttendance) && (
                    <Dialog open={billDialogOpen} onOpenChange={setBillDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="mr-2 h-4 w-4" />
                          Upload Receipt
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Upload Receipt</DialogTitle>
                          <DialogDescription>
                            Upload receipt images or PDFs for this event
                          </DialogDescription>
                        </DialogHeader>
                        
                        <Form {...billForm}>
                          <form onSubmit={billForm.handleSubmit(handleCreateBill)} className="space-y-4">
                            {/* File Upload Area */}
                            <div className="space-y-4">
                              <FormLabel>Receipt Files</FormLabel>
                              <div 
                                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
                                onClick={() => document.getElementById('receipt-upload')?.click()}
                              >
                                <Receipt className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                                <p className="text-sm text-muted-foreground mb-2">
                                  Click to upload receipt files
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Supports JPG, PNG, PDF (max 10MB each)
                                </p>
                                <input
                                  id="receipt-upload"
                                  type="file"
                                  multiple
                                  accept="image/jpeg,image/jpg,image/png,application/pdf"
                                  onChange={(e) => handleFileUpload(e.target.files)}
                                  className="hidden"
                                />
                              </div>
                              
                              {/* Uploaded Files Preview */}
                              {uploadedFiles.length > 0 && (
                                <div className="space-y-2">
                                  <h4 className="text-sm font-medium">Uploaded Files:</h4>
                                  <div className="space-y-2 max-h-32 overflow-y-auto">
                                    {uploadedFiles.map((file, index) => (
                                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                                        <div className="flex items-center space-x-2">
                                          <Receipt className="h-4 w-4" />
                                          <span className="text-sm truncate">{file.name}</span>
                                          <span className="text-xs text-muted-foreground">
                                            ({(file.size / 1024 / 1024).toFixed(1)}MB)
                                          </span>
                                        </div>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            const newFiles = uploadedFiles.filter((_, i) => i !== index)
                                            setUploadedFiles(newFiles)
                                            billForm.setValue('files', newFiles)
                                          }}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {billForm.formState.errors.files && (
                                <p className="text-sm text-destructive">
                                  {billForm.formState.errors.files.message}
                                </p>
                              )}
                            </div>
                            
                            <FormField
                              control={billForm.control}
                              name="notes"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Notes (Optional)</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder="Add any notes about this receipt..."
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <div className="flex justify-end space-x-2">
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => {
                                  setBillDialogOpen(false)
                                  setUploadedFiles([])
                                  billForm.reset()
                                }}
                              >
                                Cancel
                              </Button>
                              <Button 
                                type="submit" 
                                disabled={billLoading || uploadedFiles.length === 0}
                              >
                                {billLoading ? "Uploading..." : "Upload Receipt"}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
                
                {event.bills.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <Receipt className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No receipts yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Upload receipt images or PDFs to keep track of expenses
                      </p>
                      {(isCreator || myAttendance) && (
                        <Button onClick={() => setBillDialogOpen(true)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Upload First Receipt
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {event.bills.map((bill) => (
                      <Card key={bill.id}>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center space-x-2">
                                <Receipt className="h-4 w-4" />
                                <span className="font-medium">
                                  Receipt uploaded by {bill.payer.name}
                                </span>
                              </div>
                              
                              {bill.notes && (
                                <p className="text-sm text-muted-foreground">{bill.notes}</p>
                              )}
                              
                              {bill.attachments.length > 0 && (
                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                  <span>{bill.attachments.length} file(s) attached</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDownloadReceipt(bill)}
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </Button>
                              {(bill.payer.id === session.user.id || isCreator) && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteReceipt(bill.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="splits" className="space-y-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Bill Sharing</h3>
                  
                  {confirmedAttendees.length === 0 ? (
                    <Card>
                      <CardContent className="text-center py-8">
                        <p className="text-muted-foreground">
                          No confirmed attendees yet
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-4 text-sm font-medium border-b pb-2">
                            <div>Attendee</div>
                            <div className="text-center">Share</div>
                            <div className="text-right">Amount</div>
                          </div>
                          
                          {confirmedAttendees.map((attendance) => (
                            <div key={attendance.user!.id} className="grid grid-cols-3 gap-4 text-sm">
                              <div className="flex items-center space-x-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={attendance.user!.image} />
                                  <AvatarFallback>{attendance.user!.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span>{attendance.user!.name}</span>
                              </div>
                              <div className="text-center">
                                {confirmedAttendees.length > 0 ? (100 / confirmedAttendees.length).toFixed(1) : 0}%
                              </div>
                              <div className="text-right font-medium">
                                ${(perPersonAmount / 100).toFixed(2)}
                              </div>
                            </div>
                          ))}
                          
                          <div className="border-t pt-2 grid grid-cols-3 gap-4 text-sm font-medium">
                            <div>Total</div>
                            <div></div>
                            <div className="text-right">
                              ${(totalBillAmount / 100).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Attendees */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Attendees</span>
                </CardTitle>
                <CardDescription>
                  {event.attendances.length} invited, {confirmedAttendees.length} confirmed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {event.attendances.map((attendance) => (
                  <div key={attendance.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={attendance.user?.image} />
                        <AvatarFallback>
                          {attendance.user?.name?.charAt(0) || attendance.email.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {attendance.user?.name || attendance.email}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {attendance.email}
                          {!attendance.user && " (not registered)"}
                        </p>
                        {attendance.isPaid && (
                          <p className="text-xs text-green-600">
                            ✓ Paid{attendance.paidBy ? ` by ${attendance.paidBy.name}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge variant={
                        attendance.status === "CONFIRMED" 
                          ? "default" 
                          : attendance.status === "DECLINED"
                          ? "destructive"
                          : "secondary"
                      }>
                        {attendance.status.toLowerCase()}
                      </Badge>
                      
                      {isCreator && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => 
                            handleUpdateAttendancePaidStatus(
                              attendance.id, 
                              !attendance.isPaid, 
                              !attendance.isPaid ? session.user.id : undefined
                            )
                          }
                          className="text-xs"
                        >
                          {attendance.isPaid ? "Mark Unpaid" : "Mark Paid"}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                
                {isCreator && (
                  <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full">
                        <Plus className="mr-2 h-4 w-4" />
                        Invite More People
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Invite More People</DialogTitle>
                        <DialogDescription>
                          Add people you&apos;d like to invite to this event
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        {/* Add Attendee Input */}
                        <div className="flex space-x-2">
                          <Input
                            placeholder="colleague@company.com"
                            value={attendeeInput}
                            onChange={(e) => setAttendeeInput(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault()
                                addNewAttendee()
                              }
                            }}
                          />
                          <Button 
                            type="button" 
                            size="sm" 
                            onClick={addNewAttendee}
                            disabled={!attendeeInput.trim()}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Attendee List */}
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {newAttendeeEmails.map((email) => (
                            <div
                              key={email}
                              className="flex items-center justify-between p-2 bg-muted rounded-md"
                            >
                              <span className="text-sm">{email}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeNewAttendee(email)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          
                          {newAttendeeEmails.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No attendees added yet
                            </p>
                          )}
                        </div>

                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setInviteDialogOpen(false)
                              setNewAttendeeEmails([])
                              setAttendeeInput("")
                            }}
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleInviteAttendees}
                            disabled={newAttendeeEmails.length === 0 || inviteLoading}
                          >
                            {inviteLoading && (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            )}
                            Invite {newAttendeeEmails.length} People
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={handleDownloadBills}
                  disabled={!event.bills || event.bills.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Bills
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Calendar className="mr-2 h-4 w-4" />
                  Add to Calendar
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
