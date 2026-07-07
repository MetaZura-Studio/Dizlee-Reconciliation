"use client";

import { useEffect, useState } from "react";

import type {
  AdminUserRole,
  AdminUserStatus,
  UserFormOptions,
  UserListItem,
} from "@/lib/admin/users.shared";
import { formatUserRoleLabel } from "@/lib/admin/users.shared";

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
  const [formOptions, setFormOptions] = useState<UserFormOptions | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<UserFormValues>(() =>
    getInitialValues(mode, user),
  );

  useEffect(() => {
    void fetch("/api/admin/users?form=options")
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load form options");
        }
        setFormOptions(payload.data as UserFormOptions);
      })
      .catch((loadError) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load form options",
        );
      })
      .finally(() => setLoadingOptions(false));
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
      opcoId: values.role === "opco" ? values.opcoId : null,
      partnerId: values.role === "partner" ? values.partnerId : null,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-form-title"
        className="w-full max-w-lg rounded-lg bg-white shadow-xl"
      >
        <div className="border-b border-zinc-200 px-6 py-4">
          <h2 id="user-form-title" className="text-lg font-semibold text-zinc-900">
            {title}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {mode === "create"
              ? "A set-password link is emailed to the user (expires in 1 hour). They can change it later from their profile."
              : "Profile and access only. Password changes are done by the user."}
            {" "}Admin accounts are managed separately.
          </p>
        </div>

        <div className="space-y-4 px-6 py-5">
          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Name</span>
            <input
              type="text"
              value={values.name}
              onChange={(event) => updateField("name", event.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              autoComplete="name"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Email</span>
            <input
              type="email"
              value={values.email}
              onChange={(event) => updateField("email", event.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              autoComplete="email"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Role</span>
            <select
              value={values.role}
              onChange={(event) =>
                updateField("role", event.target.value as AdminUserRole)
              }
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="client">{formatUserRoleLabel("client")}</option>
              <option value="opco">{formatUserRoleLabel("opco")}</option>
              <option value="partner">{formatUserRoleLabel("partner")}</option>
            </select>
          </label>

          {values.role === "opco" ? (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">OpCo</span>
              <select
                value={values.opcoId}
                onChange={(event) => updateField("opcoId", event.target.value)}
                disabled={loadingOptions}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              >
                <option value="">Select OpCo</option>
                {formOptions?.opcos.map((opco) => (
                  <option key={opco.id} value={opco.id}>
                    {opco.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {values.role === "partner" ? (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Partner</span>
              <select
                value={values.partnerId}
                onChange={(event) => updateField("partnerId", event.target.value)}
                disabled={loadingOptions}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              >
                <option value="">Select Partner</option>
                {formOptions?.partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Status</span>
            <select
              value={values.status}
              onChange={(event) =>
                updateField("status", event.target.value as AdminUserStatus)
              }
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </label>
        </div>

        <div className="flex justify-end gap-3 border-t border-zinc-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting || loadingOptions}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {submitting ? "Saving…" : mode === "create" ? "Create user" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
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
