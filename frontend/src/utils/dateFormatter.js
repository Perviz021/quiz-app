import { format } from "date-fns";

export function formatDate(dateString, pattern = "d/M/yyyy") {
  return format(new Date(dateString), pattern);
}
