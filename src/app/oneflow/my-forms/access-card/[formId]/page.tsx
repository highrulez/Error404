"use client";

import { use } from "react";
import { AccessCardFormView } from "@/components/oneflow/access-card-form-view";

export default function MyFormsAccessCardPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = use(params);
  return <AccessCardFormView formId={formId} />;
}
