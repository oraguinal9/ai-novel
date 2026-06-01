CREATE TABLE IF NOT EXISTS public.game_saves (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  world_id TEXT NOT NULL,
  character TEXT NOT NULL,
  chapter INT NOT NULL DEFAULT 1,
  stats JSONB DEFAULT '{}',
  summary TEXT DEFAULT '',
  history JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now()
);
