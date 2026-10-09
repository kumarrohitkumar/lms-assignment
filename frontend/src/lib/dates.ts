/** Business dates are Indian calendar dates (UTC+5:30), matching the server. */
export const todayIst = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
