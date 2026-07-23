"use client";

import { use } from "react";
import { AccessCardFormView } from "@/components/oneflow/access-card-form-view";

/** Legacy route — same form record as /my-forms/access-card/[formId] */
export default function AccessCardFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <AccessCardFormView formId={id} />;
}
