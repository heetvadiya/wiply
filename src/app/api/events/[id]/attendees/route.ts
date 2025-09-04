import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const addAttendeesSchema = z.object({
  attendeeEmails: z.array(z.string().email()).min(1),
})

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: eventId } = await params
    const body = await request.json()
    const validatedData = addAttendeesSchema.parse(body)

    // Check if user is the creator of the event
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { creatorId: true },
    })

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    // Find the actual user in database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (event.creatorId !== user.id) {
      return NextResponse.json({ error: "Only event creator can add attendees" }, { status: 403 })
    }

    // Find existing users by email
    const existingUsers = await prisma.user.findMany({
      where: {
        email: {
          in: validatedData.attendeeEmails,
        },
      },
    })

    const existingEmails = existingUsers.map(user => user.email)
    const nonExistingEmails = validatedData.attendeeEmails.filter(email => !existingEmails.includes(email))

    // Check for existing attendances to avoid duplicates
    const existingAttendances = await prisma.attendance.findMany({
      where: {
        eventId: eventId,
        OR: [
          {
            userId: {
              in: existingUsers.map((u: any) => u.id),
            },
          },
          {
            email: {
              in: validatedData.attendeeEmails,
            },
          },
        ],
      },
    } as any)

    const existingAttendanceUserIds = existingAttendances.map((a: any) => a.userId).filter(Boolean)
    const existingAttendanceEmails = existingAttendances.map((a: any) => a.email).filter(Boolean)

    // Filter out users/emails that are already attendees
    const newExistingUsers = existingUsers.filter(u => !existingAttendanceUserIds.includes(u.id))
    const newNonExistingEmails = nonExistingEmails.filter(email => !existingAttendanceEmails.includes(email))

    // Create attendance records
    const attendanceData = []
    
    // For existing users
    for (const existingUser of newExistingUsers) {
      attendanceData.push({
        eventId: eventId,
        userId: existingUser.id,
        email: existingUser.email,
        invitedById: user.id,
        status: "PROPOSED" as const,
      })
    }

    // For non-existing users (invite by email only)
    for (const email of newNonExistingEmails) {
      attendanceData.push({
        eventId: eventId,
        email: email,
        invitedById: user.id,
        status: "PROPOSED" as const,
      })
    }

    if (attendanceData.length > 0) {
      await prisma.attendance.createMany({
        data: attendanceData as any,
      })
    }

    // Return updated attendances
    const updatedAttendances = await prisma.attendance.findMany({
      where: { eventId: eventId },
      include: {
        user: true,
        invitedBy: true,
      },
    } as any)

    return NextResponse.json({ 
      message: `Added ${attendanceData.length} new attendees`,
      attendances: updatedAttendances 
    }, { status: 201 })
  } catch (error) {
    console.error("Error adding attendees:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: eventId } = await params
    const body = await request.json()
    const { attendanceId, status, isPaid, paidById } = body

    // Check if user has permission to update this attendance
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: { event: true, user: true },
    })

    if (!attendance || attendance.eventId !== eventId) {
      return NextResponse.json({ error: "Attendance not found" }, { status: 404 })
    }

    // Find the actual user in database
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email! },
    })

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // User can update their own attendance status, or creator can update payment status
    const isOwnAttendance = attendance.userId === currentUser.id || (attendance as any).email === currentUser.email
    const isEventCreator = attendance.event.creatorId === currentUser.id

    if (!isOwnAttendance && !isEventCreator) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 })
    }

    // Prepare update data
    const updateData: any = {}
    if (status && isOwnAttendance) {
      updateData.status = status
    }
    if (typeof isPaid === 'boolean' && isEventCreator) {
      updateData.isPaid = isPaid
      if (isPaid && paidById) {
        updateData.paidById = paidById
      } else if (!isPaid) {
        updateData.paidById = null
      }
    }

    // Update attendance
    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendanceId },
      data: updateData,
      include: {
        user: true,
        invitedBy: true,
      },
    })

    return NextResponse.json(updatedAttendance)
  } catch (error) {
    console.error("Error updating attendance:", error)
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
