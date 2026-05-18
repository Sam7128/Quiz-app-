-- Challenges score columns should be NULL by default, not 0.
-- Reason: 0 can be a legitimate submitted score, so using 0 as the "not submitted" sentinel breaks completion logic.

-- 1) Schema migration: remove default 0.
alter table challenges alter column challenger_score drop default;
alter table challenges alter column opponent_score drop default;

-- 2) Data migration: only pending/active challenges should treat 0 as "not yet submitted" legacy value.
update challenges
set challenger_score = null
where status in ('pending', 'active')
  and challenger_score = 0;

update challenges
set opponent_score = null
where status in ('pending', 'active')
  and opponent_score = 0;

