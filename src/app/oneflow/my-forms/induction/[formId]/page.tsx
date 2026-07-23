"use client";

import { use } from "react";
import { InductionFormView } from "@/components/oneflow/induction-form-view";

export default function MyFormsInductionPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = use(params);
  return <InductionFormView formId={formId} />;
}
