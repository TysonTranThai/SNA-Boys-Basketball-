/**
 * Shared mutable flag so PublicOnly knows a code-join is in flight.
 *
 * Without this, the anonymous sign-in inside handleCode sets the session
 * BEFORE the join RPC finishes, PublicOnly instantly redirects /login ->
 * /dashboard, RequireTeam bounces /dashboard -> /no-team (team not set yet),
 * and only then does the join complete and navigate('/pick-identity') fire —
 * a storm of 4 hash navigations in under a second that wedges the app.
 * While this flag is set, PublicOnly lets the login page stay mounted and
 * the flow performs a single, final navigation instead.
 */
export const joinInProgress = { current: false }
