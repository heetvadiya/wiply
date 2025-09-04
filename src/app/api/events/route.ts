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
  wipWindowId: z.string(),
  attendeeEmails: z.array(z.string().email()).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!session.user.email) {
      return NextResponse.json({ error: "User email is required" }, { status: 400 })
    }

    console.log("Session user:", session.user) // Debug logging

    const body = await request.json()
    const validatedData = createEventSchema.parse(body)

    console.log("Validated data:", validatedData) // Debug logging

    // Ensure user exists in database, find by email first
    let user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      // User doesn't exist, create them
      user = await prisma.user.create({
        data: {
          id: session.user.id,
          name: session.user.name || "Unknown User",
          email: session.user.email,
          image: session.user.image,
        },
      })
    } else {
      // User exists, update their info and use their existing ID for the event
      user = await prisma.user.update({
        where: { email: session.user.email },
        data: {
          name: session.user.name || user.name,
          image: session.user.image || user.image,
        },
      })
    }

    console.log("User upserted:", user) // Debug logging

    // Create event
    const event = await prisma.event.create({
      data: {
        title: validatedData.title,
        date: new Date(validatedData.date),
        location: validatedData.location,
        notes: validatedData.notes,
        wipWindowId: validatedData.wipWindowId,
        creatorId: user.id, // Use the actual user ID from database
      },
      include: {
        creator: true,
        wipWindow: true,
      },
    })

    // Add attendees if provided
    if (validatedData.attendeeEmails && validatedData.attendeeEmails.length > 0) {
      // Find existing users by email
      const existingUsers = await prisma.user.findMany({
        where: {
          email: {
            in: validatedData.attendeeEmails,
          },
        },
      })

      const existingEmails = existingUsers.map((user: any) => user.email)
      const nonExistingEmails = validatedData.attendeeEmails.filter(email => !existingEmails.includes(email))

      // Create attendance records for existing users
      const attendanceData = []
      
      // For existing users
      for (const existingUser of existingUsers) {
        attendanceData.push({
          eventId: event.id,
          userId: existingUser.id,
          email: existingUser.email,
          invitedById: user.id, // Use the event creator's database user ID
          status: "PROPOSED" as const,
        })
      }

      // For non-existing users (invite by email only)
      for (const email of nonExistingEmails) {
        attendanceData.push({
          eventId: event.id,
          email: email,
          invitedById: user.id, // Use the event creator's database user ID
          status: "PROPOSED" as const,
        })
      }

      await prisma.attendance.createMany({
        data: attendanceData as any,
      })
    }

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error("Error creating event:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      )
    }

    // Return more detailed error information for debugging
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      },
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

    let whereClause: Record<string, unknown> = {}

    switch (filter) {
      case "my-events":
        // Find events where user is invited by userId OR by email
        const currentUser = await prisma.user.findUnique({
          where: { id: session.user.id },
        })
        
        whereClause = {
          attendances: {
            some: {
              OR: [
                {
                  userId: session.user.id,
                  status: {
                    in: ["PROPOSED", "CONFIRMED"],
                  },
                },
                currentUser?.email ? {
                  email: currentUser.email,
                  status: {
                    in: ["PROPOSED", "CONFIRMED"],
                  },
                } : undefined,
              ].filter(Boolean),
            },
          },
        }
        break
      case "created":
        whereClause = {
          creatorId: session.user.id,
        }
        break
      case "current-wip":
        whereClause = {
          wipWindow: {
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
        wipWindow: true,
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
    const eventsWithStats = events.map((event) => ({
      ...event,
      attendeeCount: event.attendances.filter((a) => a.status === "CONFIRMED").length,
      totalAmount: event.bills.reduce((sum: number, bill) => sum + bill.totalCents, 0),
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
