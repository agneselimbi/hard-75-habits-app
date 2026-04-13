import { Card } from "@mui/material";
import { UseTheme } from "../contexts/ThemeContext";

export default function NextMileStoneCard() {
  const mileStones = [25, 50, 75]; // Example milestone values
  const milestoneMessages = {
    25: "First Milestone: 25 Days! Great start, keep going!",
    50: "Second Milestone: 50 Days! You're halfway there!",
    75: "Final Milestone: 75 Days! You've completed the challenge!",
  };
  const mileStoneFractions = { 25: "1/3", 50: "2/3", 75: "100%" };
  const nextMileStone = mileStones.find((milestone) => milestone > 42); // Example current day value
  const milestoneDays = nextMileStone - 42; // Days remaining to next milestone
  console.log("Next Milestone:", nextMileStone);
  const { theme } = UseTheme();

  return (
    <Card
      sx={{
        mt: 2,
        p: 2,
        borderRadius: theme.borderRadius.medium,
        boxShadow: theme.shadows.playful,
        backgroundColor: theme.surface,
        height: "100%",
      }}
    >
      <h2>Next Milestone </h2>
      <p>
        Day {nextMileStone} - {mileStoneFractions[nextMileStone]}
        Complete!
      </p>
      <p>
        {milestoneDays} {milestoneMessages[nextMileStone]}
      </p>
    </Card>
  );
}
