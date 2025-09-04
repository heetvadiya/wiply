import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateWipWindowSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
})

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = updateWipWindowSchema.parse(body)

    const existingWindow = await prisma.wipWindow.findUnique({
      where: { id: id },
    })

    if (!existingWindow) {
      return NextResponse.json({ error: "WIP window not found" }, { status: 404 })
    }

    // If setting this as active, deactivate others
    if (validatedData.isActive) {
      await prisma.wipWindow.updateMany({
        where: { 
          isActive: true,
          id: { not: id }
        },
        data: { isActive: false },
      })
    }

    const updatedWindow = await prisma.wipWindow.update({
      where: { id: id },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.startDate && { startDate: new Date(validatedData.startDate) }),
        ...(validatedData.endDate && { endDate: new Date(validatedData.endDate) }),
        ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive }),
      },
    })

    // Update org settings if this is the new active window
    if (validatedData.isActive) {
      await prisma.orgSetting.updateMany({
        data: {
          currentWipWindowId: updatedWindow.id,
        },
      })
    }

    return NextResponse.json(updatedWindow)
  } catch (error) {
    console.error("Error updating WIP window:", error)
    
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

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'
    const { id } = await params

    const wipWindow = await prisma.wipWindow.findUnique({
      where: { id: id },
      include: {
        events: true,
      },
    })

    if (!wipWindow) {
      return NextResponse.json({ error: "WIP window not found" }, { status: 404 })
    }

    // Check if there are events and force is not specified
    if (wipWindow.events.length > 0 && !force) {
      return NextResponse.json(
        { 
          error: "Cannot delete WIP window with existing events", 
          eventCount: wipWindow.events.length,
          canForceDelete: true 
        },
        { status: 400 }
      )
    }

    // If this is the active window, we need to handle it
    if (wipWindow.isActive) {
      return NextResponse.json(
        { error: "Cannot delete the active WIP window. Please activate another window first." },
        { status: 400 }
      )
    }

    // Delete the WIP window (cascading deletes will handle events if forced)
    await prisma.wipWindow.delete({
      where: { id: id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting WIP window:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
