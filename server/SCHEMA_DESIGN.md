# Habit75 Database Schema Design

## 1. Database Tables

### users
Stores user account information and authentication credentials.

**Fields:**
- `id` (Primary Key): Unique identifier for the user
- `name`: User's display name
- `email` (Unique): User's email address for authentication
- `password`: Hashed password
- `created_at`: Timestamp when account was created
- `updated_at`: Timestamp of last account update

**Indexes:**
- Primary key on `id`
- Unique index on `email`

---

### challenges
Tracks all challenge instances created by users. Each challenge represents one attempt at the 75-day program.

**Fields:**
- `id` (Primary Key): Unique identifier for the challenge
- `user_id` (Foreign Key → users.id): Owner of the challenge
- `created_at`: Date the challenge was started (used as Day 1)
- `current_day`: Current day number of the challenge (1-75)
- `total_habits`: Number of habits being tracked in this challenge
- `completed_at` (Nullable): Timestamp when challenge was completed or failed
- `status`: Enum ['active', 'failed', 'completed'] - Default: 'active'
- `previous_challenge_id` (Nullable, Foreign Key → challenges.id): References the previous attempt if this is a restart

**Indexes:**
- Primary key on `id`
- Index on `[user_id, status]` for filtering user's active/completed challenges
- Index on `previous_challenge_id` for tracking challenge history

**Constraints:**
- Each user can have only ONE active challenge at a time
- `current_day` must be between 1 and 75
- `total_habits` must match the count of entries in challenge_habits table

---

### challenge_habits
Stores the specific habits being tracked for each challenge. Allows users to customize their habit list.

**Fields:**
- `challenge_id` (Foreign Key → challenges.id): The challenge this habit belongs to
- `user_id` (Foreign Key → users.id): Owner of the challenge (denormalized for easier querying)
- `habit_name`: Name/description of the habit (e.g., "45-min outdoor workout", "Drink 1 gallon water")
- `habit_order`: Integer representing the display order (1, 2, 3, etc.)
- `created_at`: Timestamp when habit was added

**Primary Key:** Composite key on `(challenge_id, habit_order)`

**Indexes:**
- Composite primary key on `[challenge_id, habit_order]`
- Index on `challenge_id` for quick habit lookup

**Constraints:**
- `habit_order` must be unique within a challenge
- Cannot modify habits once challenge status is not 'active'

---

### daily_checkins
Stores daily progress for each challenge, tracking which habits were completed each day.

**Fields:**
- `id` (Primary Key): Unique identifier for the check-in
- `user_id` (Foreign Key → users.id): Owner of the check-in
- `challenge_id` (Foreign Key → challenges.id): Associated challenge
- `checkin_date`: Date of this check-in (normalized to midnight UTC)
- `day_number`: Which day of the challenge this represents (1-75)
- `all_habits_completed`: Boolean indicating if all habits for this day are done
- `completed_habits_ids`: Integer array storing habit_order values of completed habits
- `completed_at` (Nullable): Timestamp when the last habit was marked complete (when all_habits_completed became true)
- `created_at`: Timestamp when check-in record was created

**Unique Constraint:** `(challenge_id, checkin_date)` - Only one check-in per challenge per day

**Indexes:**
- Primary key on `id`
- Unique index on `[challenge_id, checkin_date]`
- Index on `[user_id, checkin_date]` for user's daily history
- Index on `challenge_id` for challenge progress queries

---

### pets
Stores available pet types/species that users can choose from for gamification.

**Fields:**
- `id` (Primary Key): Unique identifier for the pet type
- `name`: Name of the pet species (e.g., "Dragon", "Phoenix", "Unicorn")
- `stage`: Number of evolution stages this pet has
- `stage_icon`: JSON or text describing icons for each stage
- `url`: Base URL or path to pet images

**Indexes:**
- Primary key on `id`

---

### user_pets
Tracks each user's selected pet and its evolution progress based on challenge streaks.

**Fields:**
- `id` (Primary Key): Unique identifier
- `user_id` (Foreign Key → users.id): Owner of the pet
- `selected_pet_id` (Foreign Key → pets.id): Which pet species was chosen
- `last_checkin_date`: Date of the last check-in (used for streak calculation)
- `current_stage`: Current evolution stage of the pet
- `created_at`: When the pet was first selected

**Indexes:**
- Primary key on `id`
- Index on `user_id` for quick user pet lookup
- Unique index on `user_id` (each user has one active pet)

---

## 2. Business Rules

### Challenge Lifecycle

**Challenge Creation:**
- User creates a challenge with custom habits (or uses Hard 75 template)
- Challenge status starts as 'active'
- `created_at` is set to current date (Day 1)
- `current_day` starts at 1
- `total_habits` must equal the number of habits defined in challenge_habits

**Daily Check-ins:**
- Users create a check-in for the current date
- `day_number` is calculated as: `floor((checkin_date - challenge.created_at) / 1 day) + 1`
- Initially, `completed_habits_ids` is an empty array
- Users mark individual habits as complete by adding their `habit_order` to the array
- When `completed_habits_ids.length === challenge.total_habits`, set `all_habits_completed = true` and record `completed_at` timestamp

**Missing a Day (Challenge Failure):**
- When a user tries to check in, calculate expected `day_number`
- Query last check-in's `day_number`
- If gap > 1 (e.g., last check-in was day 5, today should be day 8), mark challenge as 'failed'
- Set `completed_at` to the date of failure
- Update `current_day` to the day where failure occurred

**Challenge Completion:**
- When a check-in reaches `day_number = 75` AND `all_habits_completed = true`
- Set challenge status to 'completed'
- Set `completed_at` timestamp
- Update `current_day` to 75

**Restarting After Failure:**
- User creates a new challenge
- Set `previous_challenge_id` to the failed challenge's id
- New challenge starts at day 1 with `status = 'active'`
- Reset count is implicit through the chain of `previous_challenge_id` references

### One Active Challenge Rule
- Before creating a new challenge, query for existing challenges with `user_id = current_user` AND `status = 'active'`
- If found, prevent creation or auto-fail the existing challenge
- Enforce at application level and optionally with a partial unique index

### Day Counter Increment Logic
- `current_day` is NOT automatically incremented on a schedule
- `current_day` is updated when a check-in is created
- Calculate: `current_day = floor((checkin_date - challenge.created_at) / 1 day) + 1`
- If calculated day > last check-in day + 1, mark challenge as failed
- Otherwise, update challenge's `current_day` to the calculated value

### Data Access Control
- All queries MUST filter by `user_id = authenticated_user_id`
- Users can only:
  - View their own challenges, check-ins, and habits
  - Create check-ins for their own challenges
  - Modify check-ins for their own active challenges
- Use Row Level Security (RLS) in PostgreSQL to enforce at database level

---

## 3. Design Decisions

### Why Use challenge_habits Table Instead of Fixed Columns?

**Pros:**
- Flexibility: Users can customize habits beyond Hard 75's standard 6
- Extensibility: Easy to support other challenge types (30-day challenges, custom programs)
- Maintainability: Adding/removing habits doesn't require schema changes
- Scalability: Same database schema works for any number of habits

**Cons:**
- More complex queries (need joins)
- Slightly more storage overhead

**Decision:** Use flexible design because the application can grow beyond just Hard 75, and learning proper relational design is valuable for your full-stack skills.

---

### Why Use completed_habits_ids Array Instead of habit_completions Table?

**Original question:** Why not create a separate `habit_completions` table to track individual habit completion?

**Answer:** 
Since Hard 75 rules require ALL habits to be completed daily or the challenge fails, there's no partial credit. We don't need granular analytics on "which habits are skipped most" because skipping ANY habit = challenge failure.

**Array benefits:**
- Single atomic update when marking habits complete
- Faster queries (no additional join needed)
- Simpler transaction logic
- Array fits entirely in check-in row (PostgreSQL handles arrays efficiently)

**Trade-off:** 
If we later want analytics on "which habits are hardest," we'd need to parse arrays. But that's acceptable for this use case.

---

### Why Include user_id in challenge_habits?

**Denormalization for security and performance:**
- Allows queries to filter by user_id without joining through challenges table
- Enables RLS policies directly on challenge_habits
- Maintains data integrity (user_id must match challenges.user_id via FK constraint)

---

### Why Track current_day on challenges Table?

**Alternative:** Calculate day number on-the-fly from check-ins.

**Decision:** Store `current_day` for:
- Quick display without querying check-ins
- Easier validation logic
- Clear audit trail of where the challenge stopped

**Trade-off:** Need to keep it in sync with check-ins (handled in check-in creation logic).

---

### Pet Evolution and Streak Calculation

**Design:** Pet evolution is based on consecutive days completed, calculated from daily_checkins table.

**Calculation:**
```
streak_days = count of consecutive check-ins where all_habits_completed = true
```

**Why not store streak in database?**
- Streaks can be derived from check-ins data
- Avoids data synchronization issues
- One source of truth (check-ins table)

**Pet stages update when:**
- Streak reaches certain milestones (e.g., stage 2 at 10 days, stage 3 at 25 days, etc.)
- Update `user_pets.current_stage` when milestones are hit
- Update `user_pets.last_checkin_date` to track when pet was last fed

---

### Authentication and Database Security

**Implementation approach:**
1. **Password Hashing:** Use bcrypt with appropriate salt rounds (12-14)
2. **Database User Permissions:** 
   - Application connects with limited-privilege user
   - Read/write access only to application tables
   - No DROP, ALTER, or admin privileges
3. **Row Level Security (RLS):**
   - Enable on all tables
   - Policies filter rows by `user_id = current_setting('app.user_id')`
   - Application sets session variable on connection
4. **JWT Authentication:**
   - Include user_id in JWT payload
   - Verify token on every request
   - Set PostgreSQL session variable after verification

---

## 4. Indexes Strategy

**Rationale for each index:**

- `users(email)`: Fast login lookups by email
- `challenges(user_id, status)`: Most common query pattern (show me my active challenge)
- `challenges(previous_challenge_id)`: Track failure/restart chains
- `challenge_habits(challenge_id, habit_order)`: Display habits in correct order
- `daily_checkins(challenge_id, checkin_date)`: Enforce uniqueness and fast date lookups
- `daily_checkins(user_id, checkin_date)`: Calendar view of all user check-ins
- `daily_checkins(challenge_id)`: Calculate streaks and progress

---

## 5. Future Enhancements

**Considerations for later sprints:**

1. **Photo uploads:** Add `photo_url` field to daily_checkins
2. **Notes/journaling:** Add `notes` text field to daily_checkins
3. **Social features:** Add friends table, sharing, accountability partners
4. **Challenge templates:** Add templates table for pre-defined challenge types
5. **Notifications:** Add preferences for reminder times
6. **Achievements/badges:** Track milestones beyond pets (first 7 days, first 30 days, etc.)

---

