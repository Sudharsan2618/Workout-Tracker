-- User profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  current_weight DECIMAL(5,2) DEFAULT 65.0,
  target_weight DECIMAL(5,2) DEFAULT 75.0,
  height_cm INTEGER DEFAULT 172,
  daily_calorie_goal INTEGER DEFAULT 3000,
  daily_protein_goal INTEGER DEFAULT 135,
  sleep_goal_hours DECIMAL(3,1) DEFAULT 7.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gym attendance tracking
CREATE TABLE IF NOT EXISTS gym_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  attended BOOLEAN DEFAULT TRUE,
  workout_day_type TEXT CHECK (workout_day_type IN ('chest_triceps', 'back_biceps', 'legs', 'shoulders', 'rest')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Workout sessions and exercises
CREATE TABLE IF NOT EXISTS workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  workout_type TEXT NOT NULL CHECK (workout_type IN ('chest_triceps', 'back_biceps', 'legs', 'shoulders')),
  duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercise logs within a workout session
CREATE TABLE IF NOT EXISTS exercise_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight_kg DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meal tracking
CREATE TABLE IF NOT EXISTS meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  description TEXT,
  image_url TEXT,
  calories INTEGER NOT NULL DEFAULT 0,
  protein_grams DECIMAL(5,1) NOT NULL DEFAULT 0,
  ai_analysis TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sleep tracking
CREATE TABLE IF NOT EXISTS sleep_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  sleep_time TIME,
  wake_time TIME,
  duration_hours DECIMAL(3,1),
  quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Weight progress tracking (monthly)
CREATE TABLE IF NOT EXISTS weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg DECIMAL(5,2) NOT NULL,
  expected_weight_kg DECIMAL(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON profiles FOR DELETE USING (auth.uid() = id);

-- RLS Policies for gym_attendance
CREATE POLICY "gym_attendance_select_own" ON gym_attendance FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "gym_attendance_insert_own" ON gym_attendance FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "gym_attendance_update_own" ON gym_attendance FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "gym_attendance_delete_own" ON gym_attendance FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for workout_sessions
CREATE POLICY "workout_sessions_select_own" ON workout_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "workout_sessions_insert_own" ON workout_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "workout_sessions_update_own" ON workout_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "workout_sessions_delete_own" ON workout_sessions FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for exercise_logs
CREATE POLICY "exercise_logs_select_own" ON exercise_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "exercise_logs_insert_own" ON exercise_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "exercise_logs_update_own" ON exercise_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "exercise_logs_delete_own" ON exercise_logs FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for meals
CREATE POLICY "meals_select_own" ON meals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "meals_insert_own" ON meals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "meals_update_own" ON meals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "meals_delete_own" ON meals FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for sleep_logs
CREATE POLICY "sleep_logs_select_own" ON sleep_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sleep_logs_insert_own" ON sleep_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sleep_logs_update_own" ON sleep_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "sleep_logs_delete_own" ON sleep_logs FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for weight_logs
CREATE POLICY "weight_logs_select_own" ON weight_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "weight_logs_insert_own" ON weight_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "weight_logs_update_own" ON weight_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "weight_logs_delete_own" ON weight_logs FOR DELETE USING (auth.uid() = user_id);
