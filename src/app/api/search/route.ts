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

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] })
    }

    // Search events
    const events = await prisma.event.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { location: { contains: query, mode: "insensitive" } },
          { notes: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
        creator: true,
        vipWindow: true,
      },
      take: 10,
      orderBy: {
        date: "desc",
      },
    })

    // Search users
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 10,
      orderBy: {
        name: "asc",
      },
    })

    const results = [
      ...events.map(event => ({
        id: event.id,
        type: "event" as const,
        title: event.title,
        subtitle: event.creator.name,
        date: event.date.toLocaleDateString(),
        location: event.location,
        href: `/events/${event.id}`,
      })),
      ...users.map(user => ({
        id: user.id,
        type: "person" as const,
        title: user.name || user.email,
        subtitle: user.email,
        href: `/people/${user.id}`,
      })),
    ]

    return NextResponse.json({ results })
  } catch (error) {
    console.error("Error searching:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
