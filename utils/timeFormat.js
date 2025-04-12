export const convertTo12HourFormat = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  const formattedTime = `${hours12.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  return `${formattedTime} ${period}`;
};
