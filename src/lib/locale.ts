export type Lang = "pt" | "en";

const KEY = "ghostfx.lang";

function stored(): Lang | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === "pt" || value === "en" ? value : null;
  } catch {
    return null;
  }
}

export const lang: Lang =
  stored() ?? (navigator.language.toLowerCase().startsWith("pt") ? "pt" : "en");

export const isPt = lang === "pt";

export function setLang(next: Lang): void {
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* private mode */
  }
  window.location.reload();
}
