import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateAttendanceSchema = z.object({
  status: z.enum(["PROPOSED", "CONFIRMED", "DECLINED"]),
})

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateAttendanceSchema.parse(body)

    const attendance = await prisma.attendance.findUnique({
      where: { id },
      include: {
        event: true,
        user: true,
      },
    })

    if (!attendance) {
      return NextResponse.json({ error: "Attendance not found" }, { status: 404 })
    }

    // Users can only update their own attendance
    if (attendance.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const updatedAttendance = await prisma.attendance.update({
      where: { id },
      data: {
        status: validatedData.status,
      },
      include: {
        user: true,
        event: true,
      },
    })

    return NextResponse.json(updatedAttendance)
  } catch (error) {
    console.error("Error updating attendance:", error)
    
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
