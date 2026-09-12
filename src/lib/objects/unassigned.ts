import type { Course } from "@/lib/mock-data";

export const UNASSIGNED_COURSE_ID = "unassigned";

export const UNASSIGNED_COURSE: Course = {
  id: UNASSIGNED_COURSE_ID,
  slug: UNASSIGNED_COURSE_ID,
  code: "Unassigned",
  title: "Unassigned",
  description: "Work that isn’t in a course yet.",
  instructor: "",
  schedule: "",
  term: "",
};

export function isUnassignedCourse(
  course: Pick<Course, "id" | "slug"> | string,
) {
  if (typeof course === "string") {
    return course === UNASSIGNED_COURSE_ID;
  }
  return (
    course.id === UNASSIGNED_COURSE_ID || course.slug === UNASSIGNED_COURSE_ID
  );
}

export function listedCourses<T extends Pick<Course, "id" | "slug">>(
  courses: T[],
): T[] {
  return courses.filter((course) => !isUnassignedCourse(course));
}
