export const PROFILE_BUILD_PATH = "/profile/build";

/** Dashboard route for a role, e.g. "ADMIN" -> "/dashboard/admin". */
export const getDashboardPath = (role: string) =>
  `/dashboard/${role.toLowerCase()}`;