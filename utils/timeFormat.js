// utils/timeFormat.js

/**
 * Converts a 24-hour time format (e.g., "14:30") to a 12-hour format (e.g., "2:30 PM").
 * @param {string} time - The time in 24-hour format (e.g., "14:30").
 * @returns {string} The time in 12-hour format (e.g., "2:30 PM").
 */
export const convertTo12HourFormat = (time) => {
    // Split the time into hours and minutes
    const [hours, minutes] = time.split(":").map(Number);
  
    // Determine the period (AM/PM)
    const period = hours >= 12 ? "PM" : "AM";
  
    // Convert hours to 12-hour format
    const hours12 = hours % 12 || 12; // Handle the case where hours is 0 (midnight)
  
    // Format the hours and minutes as two-digit strings
    const formattedTime = `${hours12.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  
    // Return the formatted time with the period
    return `${formattedTime} ${period}`;
  };
  