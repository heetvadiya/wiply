import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import AzureADProvider from "next-auth/providers/azure-ad"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "./prisma"

export const authOptions: NextAuthOptions = {
  // adapter: PrismaAdapter(prisma), // Temporarily disabled for debugging
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  session: {
    strategy: "jwt", // Changed back to JWT for now
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) return false

      // Check if email domain is allowed
      const allowedDomains = process.env.ALLOWED_EMAIL_DOMAINS?.split(",") || []
      const emailDomain = user.email.split("@")[1]
      
      if (allowedDomains.length > 0 && !allowedDomains.includes(emailDomain)) {
        return false
      }

      try {
        // Check if user exists in database
        let dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        })

        if (!dbUser) {
          // Create new user
          dbUser = await prisma.user.create({
            data: {
              id: user.id,
              name: user.name || "Unknown User",
              email: user.email,
              image: user.image,
            },
          })

          // Link any existing attendance records by email
          await prisma.attendance.updateMany({
            where: {
              email: user.email,
              userId: { equals: null },
            },
            data: {
              userId: dbUser.id,
            },
          } as any)

          console.log(`Linked attendance records for new user: ${user.email}`)
        } else {
          // Update existing user info
          await prisma.user.update({
            where: { email: user.email },
            data: {
              name: user.name || dbUser.name,
              image: user.image || dbUser.image,
            },
          })

          // Ensure user ID is consistent
          user.id = dbUser.id
        }
      } catch (error) {
        console.error("Error during signIn callback:", error)
        // Don't block sign in due to database errors
      }

      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
}
