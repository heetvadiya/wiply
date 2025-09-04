import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface RouteParams {
  params: Promise<{
    id: string
    billId: string
  }>
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: eventId, billId } = await params

    // Check if bill exists and user has permission
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: {
        event: true,
      },
    })

    if (!bill) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 })
    }

    if (bill.eventId !== eventId) {
      return NextResponse.json({ error: "Receipt not found in this event" }, { status: 404 })
    }

    // Check if user can delete (bill uploader or event creator)
    const canDelete = bill.payerId === session.user.id || bill.event.creatorId === session.user.id

    if (!canDelete) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Delete the bill (attachments will be deleted via cascade)
    await prisma.bill.delete({
      where: { id: billId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting receipt:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

