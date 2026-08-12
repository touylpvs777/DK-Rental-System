// Local-only editor state for the "Legal Document" panel on the rental
// contract editor. There is no backend field or upload endpoint for this
// yet, so it never round-trips through the API — it lives purely in the
// page's React state, per the mock-upload requirement of this feature.

export interface LegalDocumentState {
  contract_body: string
  attachment_file: File | null
}

export const EMPTY_LEGAL_DOCUMENT: LegalDocumentState = {
  contract_body: '',
  attachment_file: null,
}
