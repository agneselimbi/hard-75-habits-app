import {
  calculateDaysDifference,
  isToday,
  getStartOfDay,
} from "../src/utils/dateHelpers";
describe("Testing calculateDays Helpers", () => {
  test("should throw error when input is missing", () => {
    //Arrange
    const date1 = null;
    const date2 = new Date();
    //Act & Assert
    expect(() => {
      calculateDaysDifference(date1, date2).toThrow(
        "Both dates must be provided",
      );
    });
  });
  test("should throw error if either input is of the incorrect type", () => {
    //Arrange
    const date1 = new Date();
    const date2 = "2025-12-18";
    //Act & Assert
    expect(() => {
      calculateDaysDifference(date1, date2).toThrow(
        "Both inputs must be of type Date",
      );
    });
  });
  test("should return the correct day difference", () => {
    //Arrange
    const date1 = new Date("2025-12-19");
    const date2 = new Date("2025-12-18");
    //Act & Assert
    expect(() => {
      calculateDaysDifference(date1, date2).toBe(1);
    });
  });
});

describe("Testing isToday function", () => {
  test("should return true if the date is today", () => {
    //Arrange
    const date = new Date();
    //Act & Assert
    expect(() => {
      isToday(date).toBe(true);
    });
  });
  test("should return false if the date is not today", () => {
    //Arrange
    const date = new Date("2025-11-02");
    //Act & Assert
    expect(() => {
      isToday(date).toBe(false);
    });
  });
  test("should throw error if input is missing", () => {
    //Arrange
    const date = null;
    //Act & Assert
    expect(() => {
      isToday(date).toThrow("Date must be provided");
    });
  });
  test("should throw error if input is not date", () => {
    //Arrange
    const date = "2025-12-18";
    //Act & Assert
    expect(() => {
      isToday(date).toThrow("Date must be of type Date");
    });
  });
});

describe("Testing getStartOfDay", () => {
  test("should throw error if input is not date", () => {
    //Arrange
    const date = 20251218;
    //Act & Assert
    expect(() => {
      getStartOfDay(date).toThrow("Date be must be of type Date");
    });
  });
  test("should throw error if input is missing", () => {
    //Arrange
    const date = null;
    //Act & Assert
    expect(() => {
      getStartOfDay(date).toThrow("Date must be provided");
    });
  });
  test("should return dayStart given a date", () => {
    //Arrange
    const date = new Date("2025-12-18");
    //Act & Assert
    expect(() => {
      getStartOfDay(date).getFullYear().toEqual(2025);
      getStartOfDay(date).getMonth().toEqual(12);
      getStartOfDay(date).getDate().toEqual(18);
      getStartOfDay(date).getHours().toEqual(0);
      getStartOfDay(date).getMinutes().toEqual(0);
      getStartOfDay(date).getSeconds().toEqual(0);
    });
  });
});
