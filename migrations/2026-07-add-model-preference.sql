-- 如果你的 user_settings 表已经建过了（之前跑过 supabase-schema.sql），
-- 只需要在 Supabase SQL Editor 里运行这一段来补上新字段：

alter table user_settings
  add column if not exists model_preference text default 'deepseek-v4-flash';
