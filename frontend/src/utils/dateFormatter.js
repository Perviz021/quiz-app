import { format } from "date-fns";

export function formatDate(dateInput, pattern = "dd/MM/yyyy") {
  // console.log("Date input:", dateInput); // Debugging line

  const date =
    typeof dateInput === "string" && !isNaN(dateInput)
      ? new Date(Number(dateInput)) // epoch as string
      : new Date(dateInput); // ISO string or Date object

  if (isNaN(date.getTime())) {
    return "Invalid date"; // optional fallback
  }

  return format(date, pattern);
}
