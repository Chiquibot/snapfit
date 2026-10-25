-- Allow blood pressure readings (systolic/diastolic/pulse in `data`, see src/lib/entries.ts).
alter table public.entries drop constraint entries_type_check;
alter table public.entries add constraint entries_type_check
  check (type in ('weight', 'meal', 'workout', 'sleep', 'checkin', 'water', 'blood_pressure'));
