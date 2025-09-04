import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createBillSchema = z.object({
  notes: z.string().optional(),
  files: z.array(z.object({
    name: z.string(),
    url: z.string(),
    size: z.number(),
  })).min(1, "At least one receipt file is required"),
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
    
    // Check if event exists and user has access
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        attendances: {
          where: { userId: session.user.id },
        },
      },
    })

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    // Check if user is creator or attendee
    const isCreator = event.creatorId === session.user.id
    const isAttendee = event.attendances.length > 0

    if (!isCreator && !isAttendee) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Ensure user exists in database
    let user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: session.user.id,
          name: session.user.name || "Unknown User",
          email: session.user.email!,
          image: session.user.image,
        },
      })
    }

    const body = await request.json()
    const validatedData = createBillSchema.parse(body)

    // Create bill (simplified - no amounts, just file storage)
    const bill = await prisma.bill.create({
      data: {
        eventId,
        payerId: user.id,
        subtotalCents: 0, // No amount tracking
        taxCents: 0,
        tipCents: 0,
        totalCents: 0,
        notes: validatedData.notes || "Receipt uploaded",
        currency: "INR",
      },
      include: {
        payer: true,
      },
    })

    // Create file attachments
    if (validatedData.files && validatedData.files.length > 0) {
      await prisma.attachment.createMany({
        data: validatedData.files.map(file => ({
          billId: bill.id,
          fileName: file.name,
          url: file.url,
          sizeBytes: file.size,
          mimeType: file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
          uploadedById: user.id,
        })),
      })
    }

    // Fetch the complete bill with attachments
    const completeBill = await prisma.bill.findUnique({
      where: { id: bill.id },
      include: {
        payer: true,
        attachments: true,
      },
    })

    return NextResponse.json(completeBill, { status: 201 })
  } catch (error) {
    console.error("Error creating bill:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
