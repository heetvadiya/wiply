"use client"

import { useEffect, useState } from "react"
import { signIn, getSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function SignInPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState<string | null>(null)
  const error = searchParams.get("error")

  useEffect(() => {
    const checkSession = async () => {
      const session = await getSession()
      if (session) {
        router.push("/")
      }
    }
    checkSession()
  }, [router])

  const handleSignIn = async (provider: string) => {
    setLoading(provider)
    try {
      await signIn(provider, { callbackUrl: "/" })
    } catch (error) {
      console.error("Sign-in error:", error)
    } finally {
      setLoading(null)
    }
  }

  const getErrorMessage = (error: string) => {
    switch (error) {
      case "AccessDenied":
        return "Your email domain is not allowed. Please contact your administrator."
      case "Configuration":
        return "There was a problem with the authentication configuration."
      case "Verification":
        return "The verification link was invalid or has expired."
      default:
        return "An error occurred during sign-in. Please try again."
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cloudy p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Calendar className="h-6 w-6" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome to WIP Events</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to manage work-in-person events and shared expenses
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {getErrorMessage(error)}
            </AlertDescription>
          </Alert>
        )}

        {/* Sign In Card */}
        <Card className="border-0 shadow-xl glass">
          <CardHeader className="text-center space-y-1">
            <CardTitle className="text-xl">Sign in to your account</CardTitle>
            <CardDescription>
              Choose your preferred sign-in method
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Microsoft Sign In */}
            <Button
              variant="outline"
              size="lg"
              className="w-full h-12 relative"
              onClick={() => handleSignIn("azure-ad")}
              disabled={loading !== null}
            >
              {loading === "azure-ad" ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
              ) : (
                <>
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 23 23">
                    <path
                      fill="currentColor"
                      d="M0 0h11v11H0V0zm12 0h11v11H12V0zM0 12h11v11H0V12zm12 0h11v11H12V12z"
                    />
                  </svg>
                  Continue with Microsoft
                </>
              )}
            </Button>

            {/* Google Sign In (if configured) */}
            {process.env.NEXT_PUBLIC_GOOGLE_ENABLED && (
              <Button
                variant="outline"
                size="lg"
                className="w-full h-12"
                onClick={() => handleSignIn("google")}
                disabled={loading !== null}
              >
                {loading === "google" ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                ) : (
                  <>
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Privacy Note */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
            <Badge variant="secondary" className="text-xs">
              Privacy Note
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            All authenticated users can view events and attendee lists. 
            Only event creators can edit their events and bills.
          </p>
        </div>
      </div>
    </div>
  )
}
