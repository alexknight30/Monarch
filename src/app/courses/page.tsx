import CoursesClient from "./courses-client";
import { listedCourses } from "@/lib/objects/unassigned";
import { getServerViewDataset } from "@/lib/views-server";

export default async function CoursesPage() {
  const { courses } = await getServerViewDataset();
  return <CoursesClient courses={listedCourses(courses)} />;
}
