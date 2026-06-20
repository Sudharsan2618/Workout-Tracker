import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Logo, LogoMark } from "@/components/logo"
import {
  Dumbbell, Target, Flame, Moon, TrendingUp, ChevronRight, Salad,
  Sparkles, Camera, Check,
} from "lucide-react"

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect("/dashboard")

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top nav */}
      <header className="sticky top-0 z-50 backdrop-blur bg-background/80 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Logo size={34} />
          <Link href="/auth/login">
            <Button variant="ghost" size="sm">Sign In</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent" />
        <div className="relative max-w-5xl mx-auto px-4 pt-14 pb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-6">
            <Sparkles className="w-3.5 h-3.5" /> Your proactive bulking coach
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-balance mb-4">
            Hit your protein &amp; calories,{" "}
            <span className="text-primary">without the guesswork</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto text-pretty mb-8">
            GainTrack tells you exactly what to eat next — with a Tamil Nadu food guide,
            smart macro suggestions, AI meal scanning, and workout tracking, all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-sm sm:max-w-none sm:w-auto mx-auto justify-center">
            <Link href="/auth/sign-up" className="sm:w-auto">
              <Button className="w-full sm:w-auto h-13 px-7 text-base font-semibold shadow-sm">
                Get Started Free <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </Link>
            <Link href="/auth/login" className="sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto h-13 px-7 text-base">Sign In</Button>
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-7 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> 50+ foods with real macros</span>
            <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> Sourced from USDA &amp; IFCT 2017</span>
            <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> Tamil Nadu meals &amp; cheat days</span>
          </div>
        </div>

        {/* Product peek */}
        <div className="relative max-w-md mx-auto px-4 pb-14">
          <div className="rounded-3xl border border-border bg-card shadow-lg p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Smart suggestions</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">You still need 40g protein and 600 kcal today. Here&apos;s how:</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: "Whey Protein", note: "1 scoop · 120 kcal · 24g P", tone: "text-primary" },
                { name: "Boiled Egg", note: "2 eggs · 156 kcal · 13g P", tone: "text-chart-2" },
                { name: "Peanuts", note: "30g · 170 kcal · 8g P", tone: "text-chart-1" },
                { name: "Curd Rice", note: "1 bowl · 280 kcal · 7g P", tone: "text-chart-3" },
              ].map((s) => (
                <div key={s.name} className="rounded-xl border border-border p-3">
                  <p className="text-sm font-semibold leading-tight">{s.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{s.note}</p>
                  <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5">+ Add 1×</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 py-14">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">Everything for the bulk</h2>
        <p className="text-muted-foreground text-center mb-10">Stop logging blindly. Get guided.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard icon={<Salad className="w-6 h-6" />} tone="primary"
            title="Food Guide & Catalog"
            description="Browse 50+ foods with calories, protein, carbs & fat per serving. Tap to add — pick your own quantity." />
          <FeatureCard icon={<Sparkles className="w-6 h-6" />} tone="primary"
            title="Smart Suggestions"
            description="See your remaining macros and get specific foods to close the gap, ranked by what helps most." />
          <FeatureCard icon={<Camera className="w-6 h-6" />} tone="chart-1"
            title="AI Meal Scan"
            description="Snap a photo and get instant calorie & protein estimates for anything not in the catalog." />
          <FeatureCard icon={<Dumbbell className="w-6 h-6" />} tone="chart-2"
            title="Workout Tracking"
            description="A 4-day split pre-loaded with progressive-overload prompts. Just tap to log your sets." />
          <FeatureCard icon={<Moon className="w-6 h-6" />} tone="chart-3"
            title="Sleep & Recovery"
            description="Track sleep for better muscle recovery and stay consistent over time." />
          <FeatureCard icon={<TrendingUp className="w-6 h-6" />} tone="primary"
            title="Weight Progress"
            description="Track actual vs expected weight and watch your journey to your goal." />
        </div>
      </section>

      {/* How it works */}
      <section className="bg-secondary/40 border-y border-border">
        <div className="max-w-5xl mx-auto px-4 py-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">Three taps to a full day</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <Step n="1" title="Set your goal" text="Tell GainTrack your weight target. It sets your daily calorie & protein numbers." />
            <Step n="2" title="See what to eat" text="Open the Food Guide. Smart suggestions show exactly what closes your remaining macros." />
            <Step n="3" title="Tap to add" text="Pick the quantity that fits your budget and add it. Your rings fill up in real time." />
          </div>
        </div>
      </section>

      {/* Goals */}
      <section className="max-w-lg mx-auto px-4 py-14">
        <h2 className="text-xl font-bold text-center mb-6">Built for your goals</h2>
        <div className="bg-card border border-border rounded-2xl shadow-sm p-5 space-y-4">
          <GoalItem icon={<Target className="w-5 h-5 text-chart-2" />} label="Daily Protein" value="Personalized" />
          <GoalItem icon={<Flame className="w-5 h-5 text-chart-1" />} label="Daily Calories" value="Personalized" />
          <GoalItem icon={<Moon className="w-5 h-5 text-chart-3" />} label="Sleep Goal" value="7 hours" />
          <GoalItem icon={<Dumbbell className="w-5 h-5 text-primary" />} label="Workouts" value="4× / week" />
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent" />
        <div className="relative max-w-3xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex mb-5"><LogoMark size={52} /></div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Ready to start your transformation?</h2>
          <p className="text-muted-foreground mb-7">Free to start. No more wondering what to eat.</p>
          <Link href="/auth/sign-up">
            <Button className="h-14 px-8 text-lg font-semibold shadow-sm">
              Start Tracking Now <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Logo size={28} />
          <p className="text-xs text-muted-foreground">Nutrition data: USDA FoodData Central &amp; IFCT 2017 (ICMR-NIN).</p>
        </div>
      </footer>
    </div>
  )
}

const TONES: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  "chart-1": "bg-chart-1/10 text-chart-1",
  "chart-2": "bg-chart-2/10 text-chart-2",
  "chart-3": "bg-chart-3/10 text-chart-3",
}

function FeatureCard({ icon, title, description, tone }: { icon: React.ReactNode; title: string; description: string; tone: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm p-5 hover:shadow-md hover:border-primary/30 transition-all">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${TONES[tone] ?? TONES.primary}`}>{icon}</div>
      <h3 className="font-semibold mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

function Step({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto w-11 h-11 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center mb-3 shadow-sm">{n}</div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  )
}

function GoalItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-muted-foreground">{label}</span>
      </div>
      <span className="font-semibold">{value}</span>
    </div>
  )
}
