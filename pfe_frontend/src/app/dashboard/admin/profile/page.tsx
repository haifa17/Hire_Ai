"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Building2, Shield, UserCircle2, Lock } from "lucide-react";
import { getApiErrorMessage } from "@/services/authService";
import { profileService } from "@/services/profileService";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";

export default function AdminProfilePage() {
  const t = useTranslations("adminDashboard.profile");
  const router = useRouter();
  const { user, updateUser } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(
    user?.avatarUrl ?? null,
  );

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    let active = true;

    profileService
      .getCurrentUserProfile()
      .then((data) => {
        if (!active) return;

        setFirstName(data.firstName ?? "");
        setLastName(data.lastName ?? "");
        setEmail(data.email ?? "");
        setPhone(data.phone ?? "");
        setAddress(data.address ?? "");
        setAvatarPreviewUrl(data.photoUrl ?? user?.avatarUrl ?? null);
      })
      .catch((err) => {
        if (!active) return;
        setError(getApiErrorMessage(err, t("errors.load")));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?.avatarUrl]);

  useEffect(() => {
    if (!avatarFile) return;

    const objectUrl = URL.createObjectURL(avatarFile);
    const applyPreview = () => setAvatarPreviewUrl(objectUrl);
    applyPreview();

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [avatarFile]);

  async function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      const updated = await profileService.updateCurrentUserProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
      });

      let uploadedPhotoUrl: string | null = null;
      if (avatarFile) {
        uploadedPhotoUrl =
          await profileService.uploadCurrentUserPhoto(avatarFile);
      }

      if (user) {
        updateUser({
          ...user,
          firstName: updated.firstName,
          lastName: updated.lastName,
          email: updated.email,
          phone: updated.phone ?? undefined,
          address: updated.address ?? undefined,
          avatarUrl: uploadedPhotoUrl ?? updated.photoUrl ?? user.avatarUrl,
        });
      }

      if (uploadedPhotoUrl) {
        setAvatarPreviewUrl(uploadedPhotoUrl);
        setAvatarFile(null);
      }

      setSuccess(t("successMessage"));
    } catch (err) {
      setError(getApiErrorMessage(err, t("errors.update")));
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const inputClass = "form-input";

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 sm:px-6 lg:px-8">
      <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-gray-500">{t("subtitle")}</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <form className="space-y-5" onSubmit={handleSubmit}>
        <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <UserCircle2 className="h-4 w-4 text-blue-600" />
            {t("sections.personalInfo")}
          </div>

          <div className="mb-5 flex items-center gap-4 rounded-lg border border-gray-100 bg-gray-50 p-3">
            <div className="relative h-16 w-16 overflow-hidden rounded-full border border-gray-200 bg-white">
              {avatarPreviewUrl ? (
                <Image
                  src={avatarPreviewUrl}
                  alt={t("photo.alt")}
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-gray-400">
                  {t("photo.placeholder")}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800">
                {t("photo.title")}
              </p>
              <p className="text-xs text-gray-500">
                {t("photo.recommendedSize")}
              </p>
              <label className="mt-2 inline-flex cursor-pointer items-center text-xs font-semibold text-blue-600 hover:text-blue-700">
                {t("photo.change")}
                {" "}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500"
                htmlFor="firstName"
              >
                {t("fields.firstName")}
              </label>
              <input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={inputClass}
                required
              />
            </div>

            <div>
              <label
                className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500"
                htmlFor="lastName"
              >
                {t("fields.lastName")}
              </label>
              <input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={inputClass}
                required
              />
            </div>

            <div>
              <label
                className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500"
                htmlFor="email"
              >
                {t("fields.email")}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                required
              />
            </div>

            <div>
              <label
                className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500"
                htmlFor="phone"
              >
                {t("fields.phone")}
              </label>
              <input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
                placeholder={t("fields.phonePlaceholder")}
              />
            </div>

            <div className="sm:col-span-2">
              <label
                className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500"
                htmlFor="address"
              >
                {t("fields.address")}
              </label>
              <input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={inputClass}
                placeholder={t("fields.addressPlaceholder")}
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Shield className="h-4 w-4 text-blue-600" />
            {t("sections.security")}
          </div>
          <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
            <div>
              <p className="text-sm font-semibold text-gray-800">
                {t("security.passwordLabel")}
              </p>
              <p className="text-xs text-gray-500">
                {t("security.passwordHint")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/change-password")}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              <Lock className="h-3.5 w-3.5" />
              {t("security.changePassword")}
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Building2 className="h-4 w-4 text-blue-600" />
            {t("sections.adminNotes")}
          </div>
          <p className="text-sm text-gray-500">{t("adminNotesText")}</p>
        </section>

        <div className="flex justify-end">
          <Button type="submit" isLoading={isSaving}>
            {t("saveButton")}
          </Button>
        </div>
      </form>
    </div>
  );
}
