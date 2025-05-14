import { format } from "date-fns";

export function formatDate(dateInput, pattern = "dd/MM/yyyy") {
  try {
    let date;

    // Handle epoch timestamps (as number or string)
    if (typeof dateInput === "number" || /^\d+$/.test(dateInput)) {
      date = new Date(Number(dateInput));
    }
    // Handle DD/MM/YYYY format
    else if (
      typeof dateInput === "string" &&
      dateInput.match(/^\d{2}\/\d{2}\/\d{4}$/)
    ) {
      const [day, month, year] = dateInput.split("/").map(Number);
      date = new Date(year, month - 1, day);
    }
    // Handle other formats
    else {
      date = new Date(dateInput);
    }

    if (isNaN(date.getTime())) {
      return "Invalid date";
    }

    return format(date, pattern);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid date";
  }
}
