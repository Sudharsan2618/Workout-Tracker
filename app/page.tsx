import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Dumbbell, Target, Flame, Moon, TrendingUp, ChevronRight } from "lucide-react"

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="relative px-4 py-16 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-6">
            <Dumbbell className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4 text-balance">
            Your Personal Fitness Coach
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto text-pretty">
            Track workouts, analyze meals with AI, monitor sleep, and reach your weight goals - all in one app.
          </p>
          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <Link href="/auth/sign-up">
              <Button className="w-full h-14 bg-primary hover:bg-primary/90 text-lg font-semibold">
                Get Started
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button variant="outline" className="w-full h-12">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="px-4 py-12">
        <h2 className="text-2xl font-bold text-foreground text-center mb-8">
          Everything You Need
        </h2>
        <div className="grid gap-4 max-w-lg mx-auto">
          <FeatureCard
            icon={<Dumbbell className="w-6 h-6" />}
            title="Smart Workout Tracking"
            description="Pre-loaded exercises with progressive overload suggestions. Just tap to log your sets."
            iconBg="bg-primary/10"
            iconColor="text-primary"
          />
          <FeatureCard
            icon={<Flame className="w-6 h-6" />}
            title="AI Meal Analysis"
            description="Take a photo of your meal and get instant calorie and protein estimates."
            iconBg="bg-chart-1/10"
            iconColor="text-chart-1"
          />
          <FeatureCard
            icon={<Moon className="w-6 h-6" />}
            title="Sleep Tracking"
            description="Monitor your sleep for optimal muscle recovery. Track consistency over time."
            iconBg="bg-chart-3/10"
            iconColor="text-chart-3"
          />
          <FeatureCard
            icon={<TrendingUp className="w-6 h-6" />}
            title="Weight Progress"
            description="Track actual vs expected weight. Visualize your journey to your goal."
            iconBg="bg-accent/10"
            iconColor="text-accent"
          />
        </div>
      </div>

      {/* Goals Preview */}
      <div className="px-4 py-12 bg-card/50">
        <div className="max-w-lg mx-auto">
          <h2 className="text-xl font-bold text-foreground text-center mb-6">
            Built for Your Goals
          </h2>
          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            <GoalItem icon={<Target className="w-5 h-5 text-chart-2" />} label="Daily Protein" value="135g" />
            <GoalItem icon={<Flame className="w-5 h-5 text-chart-1" />} label="Daily Calories" value="3000 kcal" />
            <GoalItem icon={<Moon className="w-5 h-5 text-chart-3" />} label="Sleep Goal" value="7 hours" />
            <GoalItem icon={<Dumbbell className="w-5 h-5 text-primary" />} label="Workouts" value="4x/week" />
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 py-16 text-center">
        <p className="text-muted-foreground mb-4">Ready to start your transformation?</p>
        <Link href="/auth/sign-up">
          <Button className="h-14 px-8 bg-primary hover:bg-primary/90 text-lg font-semibold">
            Start Tracking Now
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
  iconBg,
  iconColor,
}: {
  icon: React.ReactNode
  title: string
  description: string
  iconBg: string
  iconColor: string
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

function GoalItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-muted-foreground">{label}</span>
      </div>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  )
}
