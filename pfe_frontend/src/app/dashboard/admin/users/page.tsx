"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Eye,
  Filter,
  Mail,
  Pencil,
  Search,
  ShieldCheck,
  Users,
  UserCheck,
} from "lucide-react";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/services/authService";
import { useAuthStore } from "@/store/useAuthStore";

type UserRole = "CANDIDATE" | "RECRUITER" | "ADMIN";

interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  role: UserRole;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  photoUrl?: string | null;
}

interface UsersListResponse {
  items: AdminUser[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface ApiEnvelope<T> {
  message: string;
  data: T;
}

const ROLE_OPTIONS: Array<{ labelKey: string; value: "ALL" | UserRole }> = [
  { labelKey: "roleOptions.all", value: "ALL" },
  { labelKey: "roleOptions.candidate", value: "CANDIDATE" },
  { labelKey: "roleOptions.recruiter", value: "RECRUITER" },
  { labelKey: "roleOptions.admin", value: "ADMIN" },
];

const VERIFIED_OPTIONS = [
  { labelKey: "verifiedOptions.all", value: "ALL" },
  { labelKey: "verifiedOptions.verified", value: "VERIFIED" },
  { labelKey: "verifiedOptions.notVerified", value: "NOT_VERIFIED" },
] as const;

const ACCOUNT_STATUS_OPTIONS = [
  { labelKey: "accountStatusOptions.all", value: "ALL" },
  { labelKey: "accountStatusOptions.active", value: "ACTIVE" },
  { labelKey: "accountStatusOptions.suspended", value: "SUSPENDED" },
] as const;

const SORT_OPTIONS = [
  { labelKey: "sortOptions.newest", label: "Newest", sortBy: "createdAt", sortOrder: "desc" },
  { labelKey: "sortOptions.oldest", label: "Oldest", sortBy: "createdAt", sortOrder: "asc" },
  { labelKey: "sortOptions.nameAsc", label: "Name A-Z", sortBy: "firstName", sortOrder: "asc" },
  { labelKey: "sortOptions.nameDesc", label: "Name Z-A", sortBy: "firstName", sortOrder: "desc" },
  { labelKey: "sortOptions.emailAsc", label: "Email A-Z", sortBy: "email", sortOrder: "asc" },
] as const;

function roleBadgeClass(role: UserRole): string {
  if (role === "ADMIN") return "bg-purple-100 text-purple-700";
  if (role === "RECRUITER") return "bg-blue-100 text-blue-700";
  return "bg-emerald-100 text-emerald-700";
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AdminUserManagementPage() {
  const t = useTranslations("adminDashboard.users");
  const currentUser = useAuthStore((state) => state.user);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [roleFilter, setRoleFilter] = useState<"ALL" | UserRole>("ALL");
  const [verifiedFilter, setVerifiedFilter] = useState<
    "ALL" | "VERIFIED" | "NOT_VERIFIED"
  >("ALL");
  const [accountStatusFilter, setAccountStatusFilter] = useState<
    "ALL" | "ACTIVE" | "SUSPENDED"
  >("ALL");
  const [sortKey, setSortKey] = useState<(typeof SORT_OPTIONS)[number]["label"]>(
    "Newest",
  );

  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pendingActionByUser, setPendingActionByUser] = useState<
    Record<string, "verify" | "edit" | "suspension" | undefined>
  >({});
  const [suspensionCandidate, setSuspensionCandidate] =
    useState<AdminUser | null>(null);
  const [editCandidate, setEditCandidate] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchTerm(searchInput.trim());
      setPage(1);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  const sortConfig = useMemo(
    () => SORT_OPTIONS.find((option) => option.label === sortKey) ?? SORT_OPTIONS[0],
    [sortKey],
  );

  useEffect(() => {
    let active = true;

    async function loadUsers() {
      if (isLoading) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      try {
        const params: Record<string, string | number> = {
          page,
          limit,
          sortBy: sortConfig.sortBy,
          sortOrder: sortConfig.sortOrder,
        };

        if (searchTerm) params.search = searchTerm;
        if (roleFilter !== "ALL") params.role = roleFilter;
        if (verifiedFilter === "VERIFIED") params.isEmailVerified = "true";
        if (verifiedFilter === "NOT_VERIFIED")
          params.isEmailVerified = "false";
        if (accountStatusFilter === "ACTIVE") params.isActive = "true";
        if (accountStatusFilter === "SUSPENDED") params.isActive = "false";

        const res = await api.get<ApiEnvelope<UsersListResponse>>("/users", {
          params,
        });

        if (!active) return;

        setUsers(res.data.data.items);
        setPagination(res.data.data.pagination);
      } catch (err) {
        if (!active) return;
        setError(getApiErrorMessage(err, t("errors.load")));
      } finally {
        if (!active) return;
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }

    void loadUsers();

    return () => {
      active = false;
    };
  }, [
    isLoading,
    page,
    limit,
    roleFilter,
    verifiedFilter,
    accountStatusFilter,
    sortConfig,
    searchTerm,
    t,
  ]);

  const totalLabel = t("totalUsers", { count: pagination.total });
  const start = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const end = Math.min(pagination.page * pagination.limit, pagination.total);

  async function handleVerifyEmail(userId: string) {
    setError(null);
    setActionMessage(null);
    setPendingActionByUser((previous) => ({ ...previous, [userId]: "verify" }));

    try {
      const res = await api.patch<ApiEnvelope<{ user: AdminUser }>>(
        `/users/${userId}/verify-email`,
      );

      const updatedUser = res.data.data.user;
      setUsers((previous) =>
        previous.map((item) => (item.id === userId ? { ...item, ...updatedUser } : item)),
      );
      setActionMessage(res.data.message);
    } catch (err) {
      setError(getApiErrorMessage(err, t("errors.verify")));
    } finally {
      setPendingActionByUser((previous) => ({ ...previous, [userId]: undefined }));
    }
  }

  async function handleSaveUserEdit() {
    if (!editCandidate) return;
    const userId = editCandidate.id;
    setError(null);
    setActionMessage(null);
    setPendingActionByUser((previous) => ({ ...previous, [userId]: "edit" }));

    try {
      const res = await api.patch<ApiEnvelope<{ user: AdminUser }>>(
        `/users/${userId}/admin-edit`,
        {
          firstName: editForm.firstName.trim(),
          lastName: editForm.lastName.trim(),
          email: editForm.email.trim(),
          phone: editForm.phone.trim() || null,
          address: editForm.address.trim() || null,
        },
      );

      const updatedUser = res.data.data.user;
      setUsers((previous) =>
        previous.map((item) => (item.id === userId ? { ...item, ...updatedUser } : item)),
      );
      setEditCandidate(null);
      setActionMessage(res.data.message);
    } catch (err) {
      setError(getApiErrorMessage(err, t("errors.updateUser")));
    } finally {
      setPendingActionByUser((previous) => ({ ...previous, [userId]: undefined }));
    }
  }

  function openEditUserModal(user: AdminUser) {
    setEditCandidate(user);
    setEditForm({
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      address: user.address ?? "",
    });
  }

  async function handleToggleSuspension(user: AdminUser) {
    const nextIsActive = !user.isActive;

    setError(null);
    setActionMessage(null);
    setPendingActionByUser((previous) => ({
      ...previous,
      [user.id]: "suspension",
    }));

    try {
      const res = await api.patch<ApiEnvelope<{ user: AdminUser }>>(
        `/users/${user.id}/suspension`,
        { isActive: nextIsActive },
      );

      const updatedUser = res.data.data.user;
      setUsers((previous) =>
        previous.map((item) => (item.id === user.id ? { ...item, ...updatedUser } : item)),
      );
      setActionMessage(res.data.message);
    } catch (err) {
      setError(getApiErrorMessage(err, t("errors.suspension")));
    } finally {
      setPendingActionByUser((previous) => ({
        ...previous,
        [user.id]: undefined,
      }));
    }
  }

  function handleSuspendAction(user: AdminUser) {
    if (user.isActive) {
      setSuspensionCandidate(user);
      return;
    }

    void handleToggleSuspension(user);
  }

  async function confirmSuspension() {
    if (!suspensionCandidate) return;
    const target = suspensionCandidate;
    setSuspensionCandidate(null);
    await handleToggleSuspension(target);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 sm:px-6 lg:px-8">
      <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
            <p className="mt-1 text-sm text-gray-500">{t("subtitle")}</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
            <Users className="h-3.5 w-3.5" />
            {totalLabel}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Filter className="h-4 w-4 text-blue-600" />
          {t("filters.title")}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div className="md:col-span-2">
            <label
              htmlFor="searchUsers"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500"
            >
              {t("filters.search")}
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="searchUsers"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t("filters.searchPlaceholder")}
                className="form-input pl-9"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="roleFilter"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500"
            >
              {t("filters.role")}
            </label>
            <select
              id="roleFilter"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as "ALL" | UserRole);
                setPage(1);
              }}
              className="form-select"
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="verifiedFilter"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500"
            >
              {t("filters.verification")}
            </label>
            <select
              id="verifiedFilter"
              value={verifiedFilter}
              onChange={(e) => {
                setVerifiedFilter(
                  e.target.value as "ALL" | "VERIFIED" | "NOT_VERIFIED",
                );
                setPage(1);
              }}
              className="form-select"
            >
              {VERIFIED_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="sortBy"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500"
            >
              {t("filters.sortBy")}
            </label>
            <select
              id="sortBy"
              value={sortKey}
              onChange={(e) => {
                setSortKey(e.target.value as (typeof SORT_OPTIONS)[number]["label"]);
                setPage(1);
              }}
              className="form-select"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.label} value={option.label}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="accountStatusFilter"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500"
            >
              {t("filters.accountStatus")}
            </label>
            <select
              id="accountStatusFilter"
              value={accountStatusFilter}
              onChange={(e) => {
                setAccountStatusFilter(
                  e.target.value as "ALL" | "ACTIVE" | "SUSPENDED",
                );
                setPage(1);
              }}
              className="form-select"
            >
              {ACCOUNT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {actionMessage && (
          <div className="mx-4 mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {actionMessage}
          </div>
        )}

        {error && (
          <div className="m-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex min-h-65 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {t("table.user")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {t("table.role")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {t("table.verification")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {t("table.account")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {t("table.joined")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {t("table.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {users.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-sm text-gray-500"
                      >
                        {t("table.empty")}
                      </td>
                    </tr>
                  ) : (
                    users.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                              {`${item.firstName?.[0] ?? "U"}${item.lastName?.[0] ?? "S"}`}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {item.firstName} {item.lastName}
                              </p>
                              <p className="inline-flex items-center gap-1 text-xs text-gray-500">
                                <Mail className="h-3 w-3" />
                                {item.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${roleBadgeClass(
                              item.role,
                            )}`}
                          >
                            {item.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                              item.isEmailVerified
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            {item.isEmailVerified
                              ? t("badges.verified")
                              : t("badges.pending")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              item.isActive
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {item.isActive
                              ? t("badges.active")
                              : t("badges.suspended")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {formatDate(item.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/dashboard/admin/users/${item.id}`}
                              className="inline-flex items-center gap-1 rounded-md border border-indigo-300 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              {t("actions.view")}
                            </Link>

                            <button
                              type="button"
                              onClick={() => handleVerifyEmail(item.id)}
                              disabled={
                                item.isEmailVerified ||
                                pendingActionByUser[item.id] !== undefined
                              }
                              className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              {t("actions.verify")}
                            </button>

                            <button
                              type="button"
                              onClick={() => openEditUserModal(item)}
                              disabled={
                                pendingActionByUser[item.id] !== undefined ||
                                currentUser?.id === item.id
                              }
                              className="inline-flex items-center gap-1 rounded-md border border-blue-300 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              {t("actions.editUser")}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSuspendAction(item)}
                              disabled={
                                pendingActionByUser[item.id] !== undefined ||
                                currentUser?.id === item.id
                              }
                              className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
                                item.isActive
                                  ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                                  : "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              }`}
                            >
                              {item.isActive
                                ? t("actions.suspend")
                                : t("actions.unsuspend")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3">
              <p className="text-xs text-gray-500">
                {t("pagination.showing", { start, end, total: pagination.total })}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={pagination.page <= 1 || isRefreshing}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("pagination.previous")}
                </button>
                <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {t("pagination.page", {
                    page: pagination.page,
                    totalPages: Math.max(1, pagination.totalPages),
                  })}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPage((current) =>
                      Math.min(pagination.totalPages || 1, current + 1),
                    )
                  }
                  disabled={
                    pagination.page >= pagination.totalPages || isRefreshing
                  }
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("pagination.next")}
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {suspensionCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">
              {t("suspendModal.title")}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {t.rich("suspendModal.confirmText", {
                name: `${suspensionCandidate.firstName} ${suspensionCandidate.lastName}`,
                strong: (chunks) => (
                  <span className="font-semibold text-gray-900">{chunks}</span>
                ),
              })}
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSuspensionCandidate(null)}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                {t("suspendModal.cancel")}
              </button>
              <button
                type="button"
                onClick={() => void confirmSuspension()}
                disabled={
                  pendingActionByUser[suspensionCandidate.id] !== undefined
                }
                className="rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("suspendModal.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {editCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">
              {t("editModal.title")}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {t.rich("editModal.subtitle", {
                name: `${editCandidate.firstName} ${editCandidate.lastName}`,
                strong: (chunks) => (
                  <span className="font-semibold text-gray-900">{chunks}</span>
                ),
              })}
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500"
                  htmlFor="edit-first-name"
                >
                  {t("editModal.firstName")}
                </label>
                <input
                  id="edit-first-name"
                  value={editForm.firstName}
                  onChange={(e) =>
                    setEditForm((previous) => ({ ...previous, firstName: e.target.value }))
                  }
                  className="form-input"
                />
              </div>

              <div>
                <label
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500"
                  htmlFor="edit-last-name"
                >
                  {t("editModal.lastName")}
                </label>
                <input
                  id="edit-last-name"
                  value={editForm.lastName}
                  onChange={(e) =>
                    setEditForm((previous) => ({ ...previous, lastName: e.target.value }))
                  }
                  className="form-input"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500"
                  htmlFor="edit-email"
                >
                  {t("editModal.email")}
                </label>
                <input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm((previous) => ({ ...previous, email: e.target.value }))
                  }
                  className="form-input"
                />
              </div>

              <div>
                <label
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500"
                  htmlFor="edit-phone"
                >
                  {t("editModal.phone")}
                </label>
                <input
                  id="edit-phone"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm((previous) => ({ ...previous, phone: e.target.value }))
                  }
                  className="form-input"
                />
              </div>

              <div>
                <label
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500"
                  htmlFor="edit-address"
                >
                  {t("editModal.address")}
                </label>
                <input
                  id="edit-address"
                  value={editForm.address}
                  onChange={(e) =>
                    setEditForm((previous) => ({ ...previous, address: e.target.value }))
                  }
                  className="form-input"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditCandidate(null)}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                {t("editModal.cancel")}
              </button>
              <button
                type="button"
                onClick={() => void handleSaveUserEdit()}
                disabled={pendingActionByUser[editCandidate.id] !== undefined}
                className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("editModal.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
