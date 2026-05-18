alter table questions
  add column if not exists original_question_id text,
  add column if not exists source_question_key text,
  add column if not exists source_fingerprint text;

create index if not exists idx_questions_bank_source_question_key
  on questions(bank_id, source_question_key)
  where source_question_key is not null;

create index if not exists idx_questions_bank_source_fingerprint
  on questions(bank_id, source_fingerprint)
  where source_fingerprint is not null;
