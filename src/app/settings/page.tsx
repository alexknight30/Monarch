import SettingsClient from "./settings-client";
import { getServerViewDataset } from "@/lib/views-server";

export default async function SettingsPage() {
  const { user, view } = await getServerViewDataset();

  const student = {
    fullName:
      view.id === "alex-seager"
        ? "Alex Seager"
        : view.id === "alex-knight"
          ? "Alex Knight"
          : `${user.firstName} Morgan`,
    email: `${user.firstName.toLowerCase()}.${
      view.id === "alex-seager" ? "seager" : view.id === "alex-knight" ? "knight" : "morgan"
    }@westbrook.edu`,
    studentId: view.id === "mock-one" ? "WBC-204918" : view.id === "alex-knight" ? "WBC-218441" : "WBC-219003",
    major: "Computer Science",
    year: "Junior",
    school: user.school,
    preferredName: user.firstName,
  };

  const usage = {
    plan: "Student",
    periodLabel: "Aug 1 – Aug 31, 2026",
    messagesUsed: view.id === "mock-one" ? 186 : 12,
    messagesLimit: 500,
    tokensUsed: view.id === "mock-one" ? "1.2M" : "48K",
    tokensLimit: "5M",
    storageUsed: view.id === "mock-one" ? "240 MB" : "18 MB",
    storageLimit: "2 GB",
  };

  return <SettingsClient student={student} usage={usage} />;
}
