**Required Content**:

## 1. Tables needed

- users: keep track of user information. The main attributes are name, email and password
- challenges: keeps track of all the challenges submitted by users.
  - id: unique key used to identify the challenge
  - user_id: id of the user doing the challenge
  - created_at: should match the date the challenge was created
  - current_day: represents the current day of the challenge (number between 1 and 75).
  - total_habits: number of habits for the challenge
  - completed_at: challenge end data
  - status: one of "active", "failed", "completed". By default the status is set to active.
  - previous_challenge_id (nullable, references challenges.id)\
    Indexes: [user_id, status], [previous_challenge_id]
- challenge_habits: tracks every habit the user is keeping track of.\
  - challenge_id: matches the challenge id - user_id: represents the user doing the challenge - habit_name: name of the habit - habit_order: used to rank the habits - created_at: timestamp of the date the habit was created
    The combination of challenge_id and habit_order constitutes the key
    Indexes:[challenge_id, habit_order]
- daily_checkins: stores daily status of all the habits and their completion status
  - id: key for the daily checkin
  - user_id: represents the user doing the challenge
  - challenge_id: challenge id the habit is part of
  - checkin_date: date of the checkin (current day)
  - day_number: integer value of the day challenge (1-75)
  - all_habits_completed: boolean that is set to true if we have completed all our habits
  - completed_habits_ids: array that stores all the habits that have been completed
  - completed_at: timestamp of the date the last habit of the day was completed
    The combination of challenge_id and checkin_date is unique
    Indexes: [user_id, checkin_date]
    -pets: stores all the possible pets a user can use - id: unique identifier of the different pets - name: name of the pet - stage: current stage the pet is at - stage_icon: representation of the pet - url : stores the icon of the pet
- user_pet: tracks the user pet design and its evolution
  - id: id of a specific pet chosen by a given user
  - user_id: id of the user selecting the pet
  - last_checkin_date: date of the last_checkin
  - current_stage: stage the pet has evolved to
  - selected_pet: id of the pet selected

## 2. Business rules documented:

- What happens when user misses a day? \
  If a user misses a day, we want the challenge to be reset. its status will be marked as failed
- How do we handle reset-count in challenges table?\
   When the user fails the challenge, the challenge status is set to fail. If the user goes from failed to active the reset-count is incremented the current day is set to 1 and the created_date is set to the current date.
- When does day counter increment?\
  The day counter will increment when the user logs in. Calculate the number of days from created_at and current date. Then check if there is a checking for that day number. if not, and the gap>1 then mark as failed.
- Can users have multiple active challenges?\
  Each user should have only one active challenge at a givent time.
- Enforce that user only have access to their data. Always have checks so users can only see their data

## 3. Design decisions justified:

- Why not create habit completions table to keep track of the individual habits completed?\
  In completed_habits, i am keeping an array because once a habit is not completed for a day, we mark the challenge as failed and the user has to restart the challenge. So there is no opportunity to see which challenges are skipped most
- Pet evolution logic has streak_days_removed\
  This is because I decided i will calculated streak days based on the daily-checkin. Streak_days = challenge_habits.day_number.

I will be using a remote PostgreSql instead of supabase. The goal will be to learn about authentication and how to protect postgresql database.
I will need to implement:

- Password hashing
- Database user permission
- Enabling RLS to filter rows by user id
