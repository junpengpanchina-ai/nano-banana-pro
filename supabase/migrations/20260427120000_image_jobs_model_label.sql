-- V1.1: 多模型测试 — 展示名与测试备注
alter table public.image_jobs
  add column if not exists model_label text;

alter table public.image_jobs
  add column if not exists test_note text;
