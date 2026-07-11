import { Redirect } from "wouter";

/** Eski adres — köşe makaleleri artık `/editor/makaleler` altında. */
export default function EditorBlog() {
  return <Redirect to="/editor/makaleler" />;
}
