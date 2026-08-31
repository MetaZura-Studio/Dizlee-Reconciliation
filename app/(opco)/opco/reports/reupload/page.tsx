import { redirect } from "next/navigation";

/** Former Re Upload Report page — monthly reupload now lives on Report History. */
export default function OpcoReuploadReportsPage() {
  redirect("/opco/reports");
}
