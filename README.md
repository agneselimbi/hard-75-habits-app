1. Project description and goals
This project's goal is to create a habit tracking app based on the Hard 75 principle. We would build an MVP that will allow the user to create challenges, follow through with their habits on a daily basis and keeping track of daily wins. Any daily failure should lead to a challenge reset. 
Stretch goal is to add gamification elements with pets that can evolve when tasks are completed. 
2. Tech stack list
For this project, I will be using:
- Node (backend development)
- PostgreSQL ( host the database )
- React (Frontend development)
3. Prerequisites (Node version, PostgreSQL, etc.)
- node v25.2.1
- PostgreSQL 15 
- jest v30.2.1
- prisma v5.22.0
4. Installation steps (clone, install, setup DB, run)
In order to setup the project, you will need to clone the gitbub from: 
    1. Clone repo
    2. `cd server && npm install`
    3. Create `.env` with DATABASE_URL
    4. `npx prisma migrate dev`
    5. `npx prisma db seed`
5. How to run tests? 
    `npm test`
6. Folder structure explanation
7. Current project status
# Sprint 0 ✅ COMPLETE
- Completion Date: 1/14/2026
- Total Tests: 57
- Time Spent: 21 hrs
- Status: All tests passing

## Sprint 1 🚧 STARTING
- Start Date: 1/14/2026
- Expected Duration: 2 weeks