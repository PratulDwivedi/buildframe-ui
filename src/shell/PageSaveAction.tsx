"use client";

import * as React from "react";
import { Button } from "../primitives/Button";
import { RefreshButton } from "../data/toolbar";
import { PageActions } from "./page-header";

/**
 * The house place for a form's Save: the page header, top right, to the left of Refresh (and of the "?" help that PageHeader adds, when the
 * page declares its PageHeader after the form). The button is `type="submit"` with `form={formId}`, so the form needs only that id.
 * `saved` shows a short "Saved" beside it. Outside a PageHeaderProvider it draws in place, so the same screen still works without a topbar.
 */
export function PageSaveAction({ formId, label, pending = false, saved = false }: { formId: string; label: string; pending?: boolean; saved?: boolean }) {
  return (
    <PageActions>
      {saved ? (
        <span role="status" className="text-sm text-bf-ok-ink">
          Saved
        </span>
      ) : null}
      <Button type="submit" form={formId} variant="primary" size="sm" pending={pending}>
        {label}
      </Button>
      <RefreshButton />
    </PageActions>
  );
}
