import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  date: z.string().datetime(),
  location: z.string().optional(),
  notes: z.string().optional(),
  vipWindowId: z.string(),
  attendeeEmails: z.array(z.string().email()).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createEventSchema.parse(body)

    // Create event
    const event = await prisma.event.create({
      data: {
        title: validatedData.title,
        date: new Date(validatedData.date),
        location: validatedData.location,
        notes: validatedData.notes,
        vipWindowId: validatedData.vipWindowId,
        creatorId: session.user.id,
      },
      include: {
        creator: true,
        vipWindow: true,
      },
    })

    // Add attendees if provided
    if (validatedData.attendeeEmails && validatedData.attendeeEmails.length > 0) {
      // Find existing users by email
      const users = await prisma.user.findMany({
        where: {
          email: {
            in: validatedData.attendeeEmails,
          },
        },
      })

      // Create attendance records for existing users
      const attendanceData = users.map(user => ({
        eventId: event.id,
        userId: user.id,
        invitedById: session.user.id,
        status: "PROPOSED" as const,
      }))

      await prisma.attendance.createMany({
        data: attendanceData,
      })
    }

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error("Error creating event:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get("filter") // my-events, created, current-vip, all
    const search = searchParams.get("search")

    let whereClause: any = {}

    switch (filter) {
      case "my-events":
        whereClause = {
          attendances: {
            some: {
              userId: session.user.id,
              status: {
                in: ["PROPOSED", "CONFIRMED"],
              },
            },
          },
        }
        break
      case "created":
        whereClause = {
          creatorId: session.user.id,
        }
        break
      case "current-vip":
        whereClause = {
          vipWindow: {
            isActive: true,
          },
        }
        break
      default:
        // All events - no additional filter
        break
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
      ]
    }

    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        creator: true,
        vipWindow: true,
        attendances: {
          include: {
            user: true,
          },
        },
        bills: {
          include: {
            attachments: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    })

    // Calculate totals and attendee counts
    const eventsWithStats = events.map(event => ({
      ...event,
      attendeeCount: event.attendances.filter(a => a.status === "CONFIRMED").length,
      totalAmount: event.bills.reduce((sum, bill) => sum + bill.totalCents, 0),
    }))

    return NextResponse.json({ events: eventsWithStats })
  } catch (error) {
    console.error("Error fetching events:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
