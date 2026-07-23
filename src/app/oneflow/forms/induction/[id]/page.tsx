"use client";

import { use } from "react";
import { InductionFormView } from "@/components/oneflow/induction-form-view";

/** Legacy route — same form record as /my-forms/induction/[formId] */
export default function InductionFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <InductionFormView formId={id} />;
}
