import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all users who have participated in events
    const people = await prisma.user.findMany({
      where: {
        attendances: {
          some: {
            status: {
              in: ["CONFIRMED", "PROPOSED"],
            },
          },
        },
      },
      include: {
        attendances: {
          where: {
            status: "CONFIRMED",
          },
          include: {
            event: {
              include: {
                bills: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    })

    // Calculate stats for each person
    const peopleWithStats = people.map((person: any) => {
      const confirmedEvents = person.attendances || []
      const eventCount = confirmedEvents.length
      
      // Calculate total spent and owed (simplified - equal split)
      let totalSpent = 0
      let totalOwed = 0
      
      confirmedEvents.forEach((attendance: any) => {
        const event = attendance.event
        if (event.bills && event.bills.length > 0) {
          const eventTotal = event.bills.reduce((sum: number, bill: any) => sum + bill.totalCents, 0)
          const attendeeCount = confirmedEvents.length || 1
          totalOwed += eventTotal / attendeeCount
          
          // If this person paid any bills for this event
          const userBills = event.bills.filter((bill: any) => bill.payerId === person.id)
          totalSpent += userBills.reduce((sum: number, bill: any) => sum + bill.totalCents, 0)
        }
      })

      return {
        id: person.id,
        name: person.name,
        email: person.email,
        image: person.image,
        eventCount,
        totalSpent: Math.round(totalSpent),
        totalOwed: Math.round(totalOwed),
      }
    })

    return NextResponse.json({ people: peopleWithStats })
  } catch (error) {
    console.error("Error fetching people:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
