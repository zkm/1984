// Best-effort localStorage wrapper. Storage can be unavailable (private
// windows, blocked site data), so failures are ignored.

const PREFIX = 'wap-';

export function load(key) {
  try {
    return JSON.parse(localStorage.getItem(PREFIX + key));
  } catch {
    return null;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Ignore: the reader still works, it just won't remember.
  }
}
