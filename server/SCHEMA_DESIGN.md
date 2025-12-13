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
  - status: one of "active", "failed", "archived"
  - reset-count: tracks the number of times the challenge has been attempted
- challenge-habits: tracks every habit the user is keeping track of - challenge_id: matches the challenge id - user_id: represents the user doing the challenge - habit_name: name of the habit - habit_order: used to rank the habits - created_at: timestamp of the date the habit was created
  The combination of challenge_id and user_id constitutes the key
- daily_checkins: stores daily status of all the habits and their completion status
  - id: key for the daily checkin
  - user_id: represents the user doing the challenge
  - challenge_id: challenge id the habit is part of
  - checkin_date: date of the checkin (currennt day)
  - day_number: integer value of the day challenge (1-75)
  - all_habits_completed: boolean that is set to true if we have completed all our habits
  - completed_habits_ids: array that stores all the habits that have been completed
  - completed_at: timestamp of the date the last habit of the day was completed
    -pets: stores all the possible pets a user can use - name: name of the pet - stage: current stage the pet is at - stage_icon: representation of the pet - url : stores the icon of the pet
- user_pet: tracks the user pet design and its evolution
  - id: id of a specific pet chosen by a given user
  - user_id: id of the user selecting the pet
  - streak_days: number of days the challenge has run
  - last_checkin_date: date of the last_checkin
  - current_stage: stage the pet has evolved to
  - selected_pet: name of the pet selected
  - stage:

## 2. Business rules documented:

- What happens when user misses a day? \
  If a user misses a day, we want the challenge to be reset. its status will be marked as failed
- When does day counter increment?
  The day counter will increment when the user logs in. We have to check the date of the last checkin. If it is not the previous day, then reset the challenge. The user should not be able to mark past days as completed
- Can users have multiple active challenges?
  Each user should have only one active challenge at a givent time.
- Enforce that user only have access to their data. Always have checks so users can only see their data

## 3. Design decisions justified:

I will be using a remote PostgreSql instead of supabase. The goal will be to learn about authentication and how to protect postgresql database
