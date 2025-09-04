import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        creator: true,
        wipWindow: true,
        paidBy: true,
        attendances: {
          include: {
            user: true,
          },
          orderBy: {
            user: {
              name: "asc",
            },
          },
        },
        bills: {
          include: {
            payer: true,
            attachments: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    })

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    return NextResponse.json(event)
  } catch (error) {
    console.error("Error fetching event:", error)
    return NextResponse.json(
      { error: "Internal server error" },
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

    const { id } = await params
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        attendances: {
          where: { userId: session.user.id },
        },
      },
    })

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    const body = await request.json()

    // Check permissions: creator can edit everything, attendees can only edit paidById
    const isCreator = event.creatorId === session.user.id
    const isAttendee = event.attendances.length > 0
    const isOnlyUpdatingPaidBy = Object.keys(body).length === 1 && body.hasOwnProperty('paidById')

    if (!isCreator && !(isAttendee && isOnlyUpdatingPaidBy)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    
    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        ...(body.title && { title: body.title }),
        ...(body.date && { date: new Date(body.date) }),
        ...(body.location !== undefined && { location: body.location }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.paidById !== undefined && { paidById: body.paidById }),
      },
      include: {
        creator: true,
        wipWindow: true,
        paidBy: true,
        attendances: {
          include: {
            user: true,
          },
        },
        bills: {
          include: {
            payer: true,
            attachments: true,
          },
        },
      },
    })

    return NextResponse.json(updatedEvent)
  } catch (error) {
    console.error("Error updating event:", error)
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
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        bills: true,
      },
    })

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    // Only creator can delete event
    if (event.creatorId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Check if there are bills and force is not specified
    if (event.bills.length > 0 && !force) {
      return NextResponse.json(
        { 
          error: "Cannot delete event with existing bills", 
          billCount: event.bills.length,
          canForceDelete: true 
        },
        { status: 400 }
      )
    }

    // Delete the event (cascading deletes will handle related records)
    await prisma.event.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting event:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
