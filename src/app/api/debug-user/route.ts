import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all users with the same email
    const users = await prisma.user.findMany({
      where: { email: session.user.email },
    })

    // Get events created by any of these users
    const events = await prisma.event.findMany({
      where: {
        creatorId: {
          in: users.map(u => u.id)
        }
      },
      include: {
        creator: true,
      }
    })

    return NextResponse.json({
      sessionUser: session.user,
      usersWithSameEmail: users,
      eventsCreatedByThoseUsers: events,
    })
  } catch (error) {
    console.error("Debug error:", error)
    return NextResponse.json({ error: "Error" }, { status: 500 })
  }
}

