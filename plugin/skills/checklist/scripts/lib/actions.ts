// Les deux écritures de la checklist ont déménagé dans plugin/lib/soumission.ts (D52, chantier 7) :
// console update les appelle aussi, et un seul endroit du code écrit vers un moteur.
// Ce fichier reste pour que les appelants et les tests de la skill gardent leur import inchangé.
export {
  defaultFetcher, urlsOnOrigin, pingIndexNow, bingError, bingUserSites, bingSubmitFeed, redact,
  INDEXNOW_ENDPOINT, INDEXNOW_MESSAGES,
} from "../../../../lib/soumission";
export type { Fetcher, FetchInit, ActionResult } from "../../../../lib/soumission";
