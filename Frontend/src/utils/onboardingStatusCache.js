const ONBOARDING_STATUS_KEY_PREFIX = "onboarding_status::";
const LEGACY_KEY = "onboarding_status";

function getUserIdentifier() {
  try {
    const raw = localStorage.getItem("me");
    const me = raw ? JSON.parse(raw) : null;
    const candidate =
      me?.id ??
      me?.userId ??
      me?.username ??
      me?.userName ??
      me?.userEmail ??
      me?.email ??
      null;

    if (candidate != null && String(candidate).trim()) {
      return `user:${String(candidate).trim().toLowerCase()}`;
    }
  } catch {
    // ignore
  }

  const token = localStorage.getItem("token") || "";
  if (token.trim().length > 16) {
    return `token:${token.slice(-24)}`;
  }

  const role = (localStorage.getItem("role") || "USER").toString().toUpperCase();
  return `role:${role}`;
}

export function getOnboardingStatusStorageKey() {
  return `${ONBOARDING_STATUS_KEY_PREFIX}${getUserIdentifier()}`;
}

export function readOnboardingStatusCache() {
  try {
    const raw = localStorage.getItem(getOnboardingStatusStorageKey());
    if (!raw) {
      return { aiCompleted: false, mchatCompleted: false };
    }

    const parsed = JSON.parse(raw);
    return {
      aiCompleted: !!parsed?.aiCompleted,
      mchatCompleted: !!parsed?.mchatCompleted,
    };
  } catch {
    return { aiCompleted: false, mchatCompleted: false };
  }
}

export function writeOnboardingStatusCache(next) {
  try {
    localStorage.setItem(
      getOnboardingStatusStorageKey(),
      JSON.stringify({
        aiCompleted: !!next?.aiCompleted,
        mchatCompleted: !!next?.mchatCompleted,
      })
    );
  } catch {
    // ignore cache write errors
  }
}

export function clearAllOnboardingStatusCache() {
  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith(ONBOARDING_STATUS_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    }

    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // ignore cache clear errors
  }
}
