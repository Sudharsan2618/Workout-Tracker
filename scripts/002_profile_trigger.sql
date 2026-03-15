-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, current_weight, target_weight, height_cm, daily_calorie_goal, daily_protein_goal, sleep_goal_hours)
  VALUES (
    new.id,
    new.email,
    65.0,  -- Starting weight
    75.0,  -- Target weight
    172,   -- Height in cm
    3000,  -- Daily calorie goal
    135,   -- Daily protein goal
    7.0    -- Sleep goal hours
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
