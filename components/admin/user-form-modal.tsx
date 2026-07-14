"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { PortalOverlay } from "@/components/ui/portal-overlay";
import type {
  AdminUserRole,
  AdminUserStatus,
  UserListItem,
} from "@/lib/admin/users.shared";
import { formatUserRoleLabel } from "@/lib/admin/users.shared";
import { ui } from "@/lib/ui/classes";

type OrgOption = {
  id: string;
  name: string;
};

type UserFormValues = {
  name: string;
  email: string;
  role: AdminUserRole;
  status: AdminUserStatus;
  opcoId: string;
  partnerId: string;
};

type UserFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  user: UserListItem | null;
  onClose: () => void;
  onSaved: (message: string) => void;
};

type UserFormModalContentProps = {
  mode: "create" | "edit";
  user: UserListItem | null;
  onClose: () => void;
  onSaved: (message: string) => void;
};

const EMPTY_FORM: UserFormValues = {
  name: "",
  email: "",
  role: "client",
  status: "ACTIVE",
  opcoId: "",
  partnerId: "",
};

function getInitialValues(
  mode: "create" | "edit",
  user: UserListItem | null,
): UserFormValues {
  if (mode === "edit" && user) {
    return {
      name: user.name === "—" ? "" : user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      opcoId: user.opcoId ?? "",
      partnerId: user.partnerId ?? "",
    };
  }

  return EMPTY_FORM;
}

function UserFormModalContent({
  mode,
  user,
  onClose,
  onSaved,
}: UserFormModalContentProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<UserFormValues>(() =>
    getInitialValues(mode, user),
  );
  const [opcos, setOpcos] = useState<OrgOption[]>([]);
  const [partners, setPartners] = useState<OrgOption[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadOrgs = async () => {
      setOrgsLoading(true);
      try {
        const [opcosResponse, partnersResponse] = await Promise.all([
          fetch("/api/admin/opcos"),
          fetch("/api/admin/partners"),
        ]);
        const opcosBody = await opcosResponse.json();
        const partnersBody = await partnersResponse.json();

        if (!opcosResponse.ok) {
          throw new Error(opcosBody.error ?? "Failed to load OpCos");
        }
        if (!partnersResponse.ok) {
          throw new Error(partnersBody.error ?? "Failed to load Partners");
        }

        if (cancelled) {
          return;
        }

        setOpcos(
          (opcosBody.data.opcos as Array<{ id: string; name: string }>).map(
            (item) => ({ id: item.id, name: item.name }),
          ),
        );
        setPartners(
          (partnersBody.data.partners as Array<{ id: string; name: string }>).map(
            (item) => ({ id: item.id, name: item.name }),
          ),
        );
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load organizations",
          );
        }
      } finally {
        if (!cancelled) {
          setOrgsLoading(false);
        }
      }
    };

    void loadOrgs();

    return () => {
      cancelled = true;
    };
  }, []);

  const title = mode === "create" ? "Create user" : "Edit user";

  const updateField = <K extends keyof UserFormValues>(
    field: K,
    value: UserFormValues[K],
  ) => {
    setValues((current) => {
      const next = { ...current, [field]: value };
      if (field === "role") {
        if (value === "client") {
          next.opcoId = "";
          next.partnerId = "";
        } else if (value === "opco") {
          next.partnerId = "";
        } else if (value === "partner") {
          next.opcoId = "";
        }
      }
      return next;
    });
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);

    const payload = {
      name: values.name,
      email: values.email,
      role: values.role,
      status: values.status,
      opcoId: values.role === "opco" ? values.opcoId || null : null,
      partnerId: values.role === "partner" ? values.partnerId || null : null,
    };

    try {
      const response = await fetch(
        mode === "create"
          ? "/api/admin/users"
          : `/api/admin/users/${user?.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to save user");
      }

      if (mode === "create") {
        const inviteEmail = body.data?.inviteEmail as
          | { sent?: boolean; devPreviewUrl?: string }
          | undefined;
        if (inviteEmail?.sent) {
          onSaved("User created. Set-password email sent.");
        } else if (inviteEmail?.devPreviewUrl) {
          onSaved(
            `User created. Dev set-password link: ${inviteEmail.devPreviewUrl}`,
          );
        } else {
          onSaved("User created. Configure SMTP to email the set-password link.");
        }
      } else {
        onSaved("User updated.");
      }
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to save user",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PortalOverlay onClose={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-form-title"
        className={`${ui.modal} relative z-[101] max-h-[90vh] overflow-y-auto bg-surface`}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="user-form-title" className="text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        <p className="mt-1 text-sm text-foreground-subtle">
          {mode === "create"
            ? "A set-password link is emailed to the user (expires in 1 hour). They can change it later from their profile."
            : "Profile and access only. Password changes are done by the user."}{" "}
          OpCo and Partner users must be linked to an existing organization.
        </p>

        <div className="mt-4 space-y-4">
          {error ? <p className={ui.alertError}>{error}</p> : null}

          <label className="block text-sm">
            <span className={ui.label}>Name</span>
            <input
              type="text"
              value={values.name}
              onChange={(event) => updateField("name", event.target.value)}
              className={ui.input}
              autoComplete="name"
            />
          </label>

          <label className="block text-sm">
            <span className={ui.label}>Email</span>
            <input
              type="email"
              value={values.email}
              onChange={(event) => updateField("email", event.target.value)}
              className={ui.input}
              autoComplete="email"
            />
          </label>

          <label className="block text-sm">
            <span className={ui.label}>Role</span>
            <select
              value={values.role}
              onChange={(event) =>
                updateField("role", event.target.value as AdminUserRole)
              }
              className={ui.select}
            >
              <option value="client">{formatUserRoleLabel("client")}</option>
              <option value="opco">{formatUserRoleLabel("opco")}</option>
              <option value="partner">{formatUserRoleLabel("partner")}</option>
            </select>
          </label>

          {values.role === "opco" ? (
            <label className="block text-sm">
              <span className={ui.label}>OpCo</span>
              <select
                value={values.opcoId}
                onChange={(event) => updateField("opcoId", event.target.value)}
                disabled={orgsLoading}
                className={`${ui.select} disabled:bg-surface-muted`}
              >
                <option value="">
                  {orgsLoading ? "Loading OpCos…" : "Select OpCo"}
                </option>
                {opcos.map((opco) => (
                  <option key={opco.id} value={opco.id}>
                    {opco.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {values.role === "partner" ? (
            <label className="block text-sm">
              <span className={ui.label}>Partner</span>
              <select
                value={values.partnerId}
                onChange={(event) => updateField("partnerId", event.target.value)}
                disabled={orgsLoading}
                className={`${ui.select} disabled:bg-surface-muted`}
              >
                <option value="">
                  {orgsLoading ? "Loading Partners…" : "Select Partner"}
                </option>
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="block text-sm">
            <span className={ui.label}>Status</span>
            <select
              value={values.status}
              onChange={(event) =>
                updateField("status", event.target.value as AdminUserStatus)
              }
              className={ui.select}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={submitting || orgsLoading}
          >
            {submitting ? "Saving…" : mode === "create" ? "Create user" : "Save changes"}
          </Button>
        </div>
      </div>
    </PortalOverlay>
  );
}

export function UserFormModal({
  open,
  mode,
  user,
  onClose,
  onSaved,
}: UserFormModalProps) {
  if (!open) {
    return null;
  }

  return (
    <UserFormModalContent
      key={mode === "edit" ? (user?.id ?? "edit") : "create"}
      mode={mode}
      user={user}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
