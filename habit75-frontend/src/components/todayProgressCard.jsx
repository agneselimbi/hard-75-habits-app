import { Card, LinearProgress } from "@mui/material";
import { UseTheme } from "../contexts/ThemeContext";
import { Height } from "@mui/icons-material";

export default function TodayProgressCard() {
  const numberOfHabitsCompleted = 3; // Example value
  const totalHabits = 4; // Example value
  const progress = 0.75; // Example progress value (75%)
  const { theme } = UseTheme();
  return (
    <Card
      sx={{
        p: 2,
        borderRadius: theme.borderRadius.medium,
        boxShadow: theme.shadows.playful,
        backgroundColor: theme.surface,
      }}
    >
      <h2>Today's Progress</h2>
      <p>Complete your daily habits to maintain your streak!</p>
      <LinearProgress
        aria-label="Today's Habit Completion Progress"
        variant="determinate"
        value={progress * 100}
        sx={{
          height: 14,
          borderRadius: theme.borderRadius.small,

          "& .MuiLinearProgress-barColorPrimary": {
            backgroundColor: theme.secondary,
          },
        }}
      />
      <p>
        {numberOfHabitsCompleted} / {totalHabits} completed
      </p>
    </Card>
  );
}
