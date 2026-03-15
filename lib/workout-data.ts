// Pre-loaded workout routine based on user's 4-day split
// Mon: Chest + Triceps, Tue: Back + Biceps, Wed: Rest, Thu: Legs, Fri: Shoulders

export type WorkoutType = 'chest_triceps' | 'back_biceps' | 'legs' | 'shoulders'

export interface Exercise {
  name: string
  targetSets: number
  targetReps: string
  muscleGroup: string
}

export interface WorkoutDay {
  type: WorkoutType
  name: string
  dayOfWeek: string
  exercises: Exercise[]
}

export const WORKOUT_SCHEDULE: Record<number, WorkoutDay | 'rest'> = {
  1: { // Monday
    type: 'chest_triceps',
    name: 'Chest + Triceps',
    dayOfWeek: 'Monday',
    exercises: [
      { name: 'Bench Press', targetSets: 4, targetReps: '8-10', muscleGroup: 'Chest' },
      { name: 'Incline Dumbbell Press', targetSets: 3, targetReps: '10-12', muscleGroup: 'Upper Chest' },
      { name: 'Chest Fly', targetSets: 3, targetReps: '12-15', muscleGroup: 'Chest' },
      { name: 'Tricep Pushdown', targetSets: 3, targetReps: '12-15', muscleGroup: 'Triceps' },
      { name: 'Dips', targetSets: 3, targetReps: '8-12', muscleGroup: 'Triceps/Chest' },
    ],
  },
  2: { // Tuesday
    type: 'back_biceps',
    name: 'Back + Biceps',
    dayOfWeek: 'Tuesday',
    exercises: [
      { name: 'Pull Ups', targetSets: 4, targetReps: '6-10', muscleGroup: 'Back' },
      { name: 'Lat Pulldown', targetSets: 3, targetReps: '10-12', muscleGroup: 'Lats' },
      { name: 'Barbell Row', targetSets: 4, targetReps: '8-10', muscleGroup: 'Back' },
      { name: 'Dumbbell Curl', targetSets: 3, targetReps: '10-12', muscleGroup: 'Biceps' },
      { name: 'Hammer Curl', targetSets: 3, targetReps: '10-12', muscleGroup: 'Biceps' },
    ],
  },
  3: 'rest', // Wednesday
  4: { // Thursday
    type: 'legs',
    name: 'Legs',
    dayOfWeek: 'Thursday',
    exercises: [
      { name: 'Squats', targetSets: 4, targetReps: '8-10', muscleGroup: 'Quads/Glutes' },
      { name: 'Leg Press', targetSets: 3, targetReps: '10-12', muscleGroup: 'Quads' },
      { name: 'Romanian Deadlift', targetSets: 4, targetReps: '8-10', muscleGroup: 'Hamstrings' },
      { name: 'Calf Raises', targetSets: 4, targetReps: '15-20', muscleGroup: 'Calves' },
    ],
  },
  5: { // Friday
    type: 'shoulders',
    name: 'Shoulders',
    dayOfWeek: 'Friday',
    exercises: [
      { name: 'Overhead Press', targetSets: 4, targetReps: '8-10', muscleGroup: 'Shoulders' },
      { name: 'Lateral Raises', targetSets: 3, targetReps: '12-15', muscleGroup: 'Side Delts' },
      { name: 'Rear Delt Fly', targetSets: 3, targetReps: '12-15', muscleGroup: 'Rear Delts' },
      { name: 'Shrugs', targetSets: 3, targetReps: '12-15', muscleGroup: 'Traps' },
    ],
  },
  6: 'rest', // Saturday
  0: 'rest', // Sunday
}

export function getTodayWorkout(): WorkoutDay | 'rest' {
  const dayOfWeek = new Date().getDay()
  return WORKOUT_SCHEDULE[dayOfWeek]
}

export function getWorkoutByType(type: WorkoutType): WorkoutDay | undefined {
  const workouts = Object.values(WORKOUT_SCHEDULE).filter(
    (w): w is WorkoutDay => w !== 'rest'
  )
  return workouts.find(w => w.type === type)
}

export function isWorkoutDay(): boolean {
  return getTodayWorkout() !== 'rest'
}

// Progressive overload suggestions based on performance
export function getProgressiveOverloadSuggestion(
  exerciseName: string,
  lastWeight: number,
  lastReps: number,
  proteinIntake: number,
  proteinGoal: number
): string {
  const proteinRatio = proteinIntake / proteinGoal
  
  if (proteinRatio < 0.8) {
    return `Focus on hitting your protein goal first. You're at ${Math.round(proteinRatio * 100)}% of your daily protein target.`
  }
  
  if (lastReps >= 12) {
    const newWeight = Math.ceil(lastWeight * 1.05 / 2.5) * 2.5 // Round to nearest 2.5kg
    return `Great progress! Try increasing to ${newWeight}kg for your next session.`
  }
  
  if (lastReps >= 8) {
    return `You're in the growth zone. Try adding 1-2 more reps next session.`
  }
  
  return `Focus on form and completing ${lastReps + 1} reps before increasing weight.`
}

// Goal calculations
export const USER_GOALS = {
  currentWeight: 65, // kg
  targetWeight: 75, // kg
  dailyCalories: 3000,
  dailyProtein: 135, // grams
  sleepHours: 7,
  heightCm: 172,
}

export function calculateExpectedWeight(startDate: Date, startWeight: number): number {
  // Aim for 0.25-0.5kg per week for lean muscle gain
  const weeksElapsed = Math.floor((Date.now() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
  const expectedGain = weeksElapsed * 0.35 // 0.35kg per week average
  return Math.min(startWeight + expectedGain, USER_GOALS.targetWeight)
}

export function getCalorieTip(currentCalories: number, goal: number): string {
  const remaining = goal - currentCalories
  const percentage = (currentCalories / goal) * 100
  
  if (percentage >= 100) {
    return "You've hit your calorie goal! Great job fueling your gains."
  }
  
  if (percentage >= 80) {
    return `Almost there! ${remaining} kcal to go. A protein shake or snack would do it.`
  }
  
  if (percentage >= 50) {
    return `You're halfway. Consider a balanced meal with ${Math.round(remaining / 2)} kcal.`
  }
  
  return `You need ${remaining} kcal. Plan your remaining meals to hit your surplus.`
}

export function getProteinTip(currentProtein: number, goal: number): string {
  const remaining = goal - currentProtein
  const percentage = (currentProtein / goal) * 100
  
  if (percentage >= 100) {
    return "Protein goal achieved! Your muscles have the fuel they need."
  }
  
  if (percentage >= 80) {
    return `${remaining}g to go. A chicken breast or protein shake will get you there.`
  }
  
  if (percentage >= 50) {
    return `Keep pushing! Add protein-rich foods to your remaining meals.`
  }
  
  return `Prioritize protein in your next meals. You need ${remaining}g more.`
}

export function getSleepTip(hours: number, goal: number): string {
  if (hours >= goal) {
    return "Excellent recovery! You're giving your muscles the rest they need."
  }
  
  if (hours >= goal - 1) {
    return "Close to optimal. Try to get to bed 30 minutes earlier tonight."
  }
  
  return "Sleep is crucial for muscle growth. Aim for earlier bedtime tonight."
}
