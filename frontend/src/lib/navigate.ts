/** Full page navigation, so a new session starts from a clean client state. Wrapped so tests can replace it. */
export function navigate(url: string) {
  window.location.assign(url);
}
