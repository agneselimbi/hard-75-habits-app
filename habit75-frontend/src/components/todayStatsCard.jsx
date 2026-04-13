import { Card, LinearProgress } from "@mui/material";
import { UseTheme } from "../contexts/ThemeContext";

export default function TodayStatsCard() {
  const numberOfDays = 42; // Example value
  const daysRemaining = 75 - numberOfDays; // Example value
  const progress = 0.56; // Example progress value (75%)
  const { theme } = UseTheme();

  return (
    <Card
      sx={{
        mt: 2,
        p: 2,
        borderRadius: theme.borderRadius.medium,
        boxShadow: theme.shadows.playful,
        backgroundColor: theme.surface,
      }}
    >
      <h2>Challenge Stats</h2>
      <p>{numberOfDays} days in a row! Keep it up!</p>
      <p> {daysRemaining} days remaining to reach your goal!</p>
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
      <p>{Math.round(progress * 100)} % of challenge completed</p>
    </Card>
  );
}
