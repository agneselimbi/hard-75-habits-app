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

export function getStartOfDay(date) {
  date.setHours(0);
  date.setMinutes(0);
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date;
}

export function isToday(date) {
  if (!date) {
    throw new Error("Date must be provided");
  }
  if (!(date instanceof Date)) {
    throw new Error("Date must be of type Date");
  }
  const today = getStartOfDay(new Date());
  const providedDate = getStartOfDay(date);
  return providedDate.getTime() === today.getTime();
}
export function getDateDifference(date, days) {
  if (!date) {
    throw new Error("Need to provide date");
  }
  if (days === undefined || days === null) {
    throw new Error("Need to provide number of days");
  }
  if (!(date instanceof Date) || isNaN(date)) {
    throw new Error("Date must be of type valid Date");
  }
  if (typeof days !== "number" || isNaN(days)) {
    throw new Error("Input days should be of type integer");
  }

  // Calculate difference: milliseconds in a day = 1000 * 60 * 60 * 24
  const diffDays = new Date(date).getTime() - days * 1000 * 60 * 60 * 24;
  return new Date(diffDays);
}
