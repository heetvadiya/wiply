import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createWipWindowSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  isActive: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const wipWindows = await prisma.wipWindow.findMany({
      include: {
        events: {
          include: {
            attendances: {
              where: { status: "CONFIRMED" },
            },
          },
        },
      },
      orderBy: {
        startDate: "desc",
      },
    })

    // Add event counts to each WIP window
    const wipWindowsWithStats = wipWindows.map(window => ({
      ...window,
      eventCount: window.events.length,
      participantCount: new Set(
        window.events.flatMap(event => 
          event.attendances.map(attendance => attendance.userId)
        )
      ).size,
    }))

    return NextResponse.json({ wipWindows: wipWindowsWithStats })
  } catch (error) {
    console.error("Error fetching WIP windows:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createWipWindowSchema.parse(body)

    // If setting this as active, deactivate others
    if (validatedData.isActive) {
      await prisma.wipWindow.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      })
    }

    const wipWindow = await prisma.wipWindow.create({
      data: {
        name: validatedData.name,
        startDate: new Date(validatedData.startDate),
        endDate: new Date(validatedData.endDate),
        isActive: validatedData.isActive || false,
      },
    })

    // Update org settings if this is the new active window
    if (validatedData.isActive) {
      await prisma.orgSetting.updateMany({
        data: {
          currentWipWindowId: wipWindow.id,
        },
      })
    }

    return NextResponse.json(wipWindow, { status: 201 })
  } catch (error) {
    console.error("Error creating WIP window:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
