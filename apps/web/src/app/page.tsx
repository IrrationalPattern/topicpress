import { redirect } from "next/navigation";

import { getDefaultLocalePath } from "@/lib/locale-routing";

export default function HomePage() {
  redirect(getDefaultLocalePath());
}
