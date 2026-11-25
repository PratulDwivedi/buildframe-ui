"use client";

import * as React from "react";
import { CheckIcon } from "lucide-react";
import { Button } from "../primitives/Button";
import { RefreshButton } from "../data/toolbar";
import { PageActions } from "./page-header";

/**
 * The house place for a form's Save: the page header, top right, to the left of Refresh (and of the "?" help that PageHeader adds, when the
 * page declares its PageHeader after the form). The button is `type="submit"` with `form={formId}`, so the form needs only that id.
 * While `saved` is true the button itself shows a green "Saved" with a tick, so the answer is where the eye already is; the screen turns
 * `saved` off after a few seconds (see `useFlash`) and the button goes back to its label. Screen readers get a spoken "Saved".
 * Outside a PageHeaderProvider it draws in place, so the same screen still works without a topbar.
 */
export function PageSaveAction({ formId, label, pending = false, saved = false }: { formId: string; label: string; pending?: boolean; saved?: boolean }) {
  return (
    <PageActions>
      {saved ? (
        <span role="status" className="sr-only">
          Saved
        </span>
      ) : null}
      {saved && !pending ? (
        <Button type="submit" form={formId} variant="secondary" size="sm" className="border-bf-ok-ink/30 bg-bf-ok-bg text-bf-ok-ink hover:bg-bf-ok-bg">
          <CheckIcon aria-hidden className="mr-1.5 size-4" />
          Saved
        </Button>
      ) : (
        <Button type="submit" form={formId} variant="primary" size="sm" pending={pending}>
          {label}
        </Button>
      )}
      <RefreshButton />
    </PageActions>
  );
}
