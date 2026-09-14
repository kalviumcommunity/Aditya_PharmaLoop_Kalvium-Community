import { redirect } from "next/navigation";

export default function MedicinesRedirectPage() {
  redirect("/dashboard/medicines");
}
