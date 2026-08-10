-- SQL SCRIPT FOR SUPABASE SQL EDITOR
-- TO ENABLE ANONYMOUS FREE VOTING (Bypasses RLS using SECURITY DEFINER)

CREATE OR REPLACE FUNCTION submit_free_vote(
  p_full_name text,
  p_class text,
  p_category_votes jsonb -- array of {category_id, candidate_id}
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_voter_id uuid;
  v_vote jsonb;
  v_unique_card_id text;
BEGIN
  -- Generate a unique voter ID and random card ID
  v_voter_id := gen_random_uuid();
  v_unique_card_id := 'FV-' || floor(random() * 900000 + 100000)::text;

  -- 1. Insert dummy profile for anonymous voter
  INSERT INTO profiles (
    id,
    full_name,
    email,
    class,
    card_id,
    role,
    account_status,
    voting_status,
    card_visibility
  ) VALUES (
    v_voter_id,
    p_full_name,
    'freevote-' || v_voter_id || '@ppu.co',
    p_class,
    v_unique_card_id,
    'user',
    'dikonfirmasi',
    'sudah',
    false
  );

  -- 2. Insert each vote in the category_votes array
  FOR v_vote IN SELECT * FROM jsonb_array_elements(p_category_votes) LOOP
    INSERT INTO votes (
      voter_id,
      category_id,
      candidate_id,
      created_at
    ) VALUES (
      v_voter_id,
      (v_vote->>'category_id')::uuid,
      (v_vote->>'candidate_id')::uuid,
      now()
    );
  END LOOP;

  RETURN true;
END;
$$;
