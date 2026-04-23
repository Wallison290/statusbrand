-- Migration: add folder_name to client_materials
-- Run this in the Supabase SQL Editor before deploying the new features.

ALTER TABLE client_materials
  ADD COLUMN IF NOT EXISTS folder_name TEXT;
