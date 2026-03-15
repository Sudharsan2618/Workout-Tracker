import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Mail, CheckCircle2 } from "lucide-react"

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/20 mb-6">
          <CheckCircle2 className="w-8 h-8 text-accent" />
        </div>
        
        <h1 className="text-2xl font-bold text-foreground mb-2">Check Your Email</h1>
        <p className="text-muted-foreground mb-6">
          We&apos;ve sent you a confirmation link. Click it to activate your account and start tracking your fitness journey.
        </p>

        <div className="bg-card border border-border rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-primary" />
            <p className="text-sm text-muted-foreground">
              Can&apos;t find the email? Check your spam folder.
            </p>
          </div>
        </div>

        <Link href="/auth/login">
          <Button variant="outline" className="w-full h-12">
            Back to Login
          </Button>
        </Link>
      </div>
    </div>
  )
}
