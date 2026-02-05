-- Migration: Add email field to departments table
-- Created: 2026-02-03

-- Add email column to departments table
ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.departments.email IS 'Email của phòng ban';
