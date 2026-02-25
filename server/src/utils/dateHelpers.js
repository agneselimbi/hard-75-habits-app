export function calculateDaysDifference(date1, date2) {
  if (!date1 || !date2) {
    throw new Error("Both dates must be provided");
  }
  if (!(date1 instanceof Date) || !(date2 instanceof Date)) {
    throw new Error("Both inputs must be of type Date");
  }
  const diffinDays = date2.getTime() - date1.getTime();
  return diffinDays / (1000 * 60 * 60 * 24);
}
export function isToday(date) {
  if (!date) {
    throw new Error("Date must be provided");
  }
  if (!(date instanceof Date)) {
    throw new Error("Date must be of type Date");
  }
  return date === new Date();
}

export function getStartOfDay(date) {
  date.setHours(0);
  date.setMinutes(0);
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date;
}

// calculateDaysDifference, isToday, getStartOfDay };
