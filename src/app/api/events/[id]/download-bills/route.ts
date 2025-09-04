import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import JSZip from "jszip"

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
    // Get event with bills and attachments
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        bills: {
          include: {
            items: true,
            attachments: true,
            payer: true,
          },
        },
        creator: true,
        attendances: {
          where: {
            status: "CONFIRMED",
          },
          include: {
            user: true,
          },
        },
      },
    })

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    // Check if user has access (creator or confirmed attendee)
    const hasAccess = event.creatorId === session.user.id || 
      event.attendances.some((attendance: any) => attendance.userId === session.user.id)

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Create a ZIP file containing bill summary and receipts
    const zip = new JSZip()

    // Create bill summary text file
    let billSummary = `Event: ${event.title}\n`
    billSummary += `Date: ${event.date.toLocaleDateString()}\n`
    billSummary += `Location: ${event.location || 'Not specified'}\n`
    billSummary += `Created by: ${event.creator.name}\n\n`

    billSummary += `=== BILLS SUMMARY ===\n\n`

    const confirmedAttendees = event.attendances
    const totalEventCost = event.bills.reduce((sum, bill) => sum + bill.totalCents, 0)
    const perPersonCost = confirmedAttendees.length > 0 ? totalEventCost / confirmedAttendees.length : 0

    event.bills.forEach((bill, index) => {
      billSummary += `Bill ${index + 1}:\n`
      billSummary += `  Paid by: ${bill.payer.name}\n`
      billSummary += `  Subtotal: ₹${(bill.subtotalCents / 100).toLocaleString('en-IN')}\n`
      billSummary += `  Tax: ₹${(bill.taxCents / 100).toLocaleString('en-IN')}\n`
      billSummary += `  Tip: ₹${(bill.tipCents / 100).toLocaleString('en-IN')}\n`
      billSummary += `  Total: ₹${(bill.totalCents / 100).toLocaleString('en-IN')}\n`
      if (bill.notes) {
        billSummary += `  Notes: ${bill.notes}\n`
      }
      
      if (bill.items.length > 0) {
        billSummary += `  Items:\n`
        bill.items.forEach(item => {
          billSummary += `    - ${item.label}: ₹${(item.amountCents / 100).toLocaleString('en-IN')} x ${item.quantity}\n`
        })
      }
      billSummary += `\n`
    })

    billSummary += `=== COST SHARING ===\n\n`
    billSummary += `Total Event Cost: ₹${(totalEventCost / 100).toLocaleString('en-IN')}\n`
    billSummary += `Number of Attendees: ${confirmedAttendees.length}\n`
    billSummary += `Cost per Person: ₹${(perPersonCost / 100).toLocaleString('en-IN')}\n\n`

    billSummary += `Attendees:\n`
    confirmedAttendees.forEach(attendance => {
      billSummary += `  - ${attendance.user.name} (${attendance.user.email})\n`
    })

    zip.file(`${event.title} - Bill Summary.txt`, billSummary)

    // Add receipt files (if any)
    const attachments = event.bills.flatMap(bill => bill.attachments)
    
    if (attachments.length > 0) {
      const receiptsFolder = zip.folder("receipts")
      
      for (const attachment of attachments) {
        try {
          // In a real implementation, you'd fetch the actual file from your storage
          // For now, we'll just include the file info
          const fileInfo = `Receipt: ${attachment.fileName}\nSize: ${attachment.sizeBytes} bytes\nUploaded: ${attachment.createdAt.toISOString()}\nURL: ${attachment.url}`
          receiptsFolder?.file(`${attachment.fileName}.info.txt`, fileInfo)
        } catch (error) {
          console.error(`Error processing attachment ${attachment.id}:`, error)
        }
      }
    }

    // Generate the ZIP
    const zipBuffer = await zip.generateAsync({ type: "arraybuffer" })

    // Return the ZIP file
    const fileName = `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}_Bills.zip`
    
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': zipBuffer.byteLength.toString(),
      },
    })

  } catch (error) {
    console.error("Error generating bill download:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

