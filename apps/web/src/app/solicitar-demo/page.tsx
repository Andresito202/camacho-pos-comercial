import { redirect } from "next/navigation";

/** Legacy path — replaced by commercial 5-day trial. */
export default function SolicitarDemoRedirectPage() {
  redirect("/prueba-5-dias");
}
