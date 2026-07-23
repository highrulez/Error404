"use client";

import { OneFlowShell } from "@/components/oneflow/shell";
import { ExitClearanceFormView } from "@/components/oneflow/exit-clearance-form-view";
import { use } from "react";

export default function ExitClearanceFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <OneFlowShell
      title="Employee Exit Clearance Form"
      subtitle="Digital exit clearance following the paper form structure"
    >
      <ExitClearanceFormView formId={id} />
    </OneFlowShell>
  );
}
