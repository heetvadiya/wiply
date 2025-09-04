import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userEmail = session.user.email
    
    // Find the existing user with the same email
    const existingUser = await prisma.user.findUnique({
      where: { email: userEmail },
    })

    if (!existingUser) {
      return NextResponse.json({ error: "No existing user found" }, { status: 404 })
    }

    // Update the existing user's ID to match the session ID
    // We need to create the new user first, then update references
    await prisma.$transaction(async (tx) => {
      // Step 1: Create new user record with session ID
      await tx.user.create({
        data: {
          id: session.user.id,
          name: session.user.name || existingUser.name,
          email: `temp_${Date.now()}_${session.user.email}`, // Temporary email to avoid unique constraint
          image: session.user.image || existingUser.image,
          emailVerified: existingUser.emailVerified,
        },
      })

      // Step 2: Update events created by this user
      await tx.event.updateMany({
        where: { creatorId: existingUser.id },
        data: { creatorId: session.user.id },
      })

      // Step 3: Update attendances
      await tx.attendance.updateMany({
        where: { userId: existingUser.id },
        data: { userId: session.user.id },
      })

      // Step 4: Update bills paid by this user
      await tx.bill.updateMany({
        where: { payerId: existingUser.id },
        data: { payerId: session.user.id },
      })

      // Step 5: Delete the old user record
      await tx.user.delete({
        where: { id: existingUser.id },
      })

      // Step 6: Update new user with correct email
      await tx.user.update({
        where: { id: session.user.id },
        data: { email: userEmail },
      })
    })

    return NextResponse.json({ 
      success: true, 
      message: "User ID synced successfully",
      oldId: existingUser.id,
      newId: session.user.id,
    })
  } catch (error) {
    console.error("Fix user error:", error)
    return NextResponse.json({ 
      error: "Failed to fix user", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 })
  }
}
