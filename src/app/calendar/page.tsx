import { CalendarClient } from "./calendar-client";
import { getServerViewDataset } from "@/lib/views-server";

export default async function CalendarPage() {
  const data = await getServerViewDataset();
  return (
    <CalendarClient
      source={{
        calendarCourses: data.calendarCourses,
        officeHours: data.officeHours,
        deadlines: data.deadlines,
        studySessions: data.studySessions,
        storedCalendar: data.storedCalendar,
      }}
    />
  );
}
