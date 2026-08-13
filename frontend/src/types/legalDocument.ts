// Local editor state for the "Legal Document" panel on the rental contract
// editor. `attachment_file` holds a newly-picked file pending upload (not
// yet sent to the server); `attachment_url` holds whatever is already
// persisted on the contract (from a prior save, or just-completed upload).
// `contract_body` mirrors the contract's `contract_body` column directly.

export interface LegalDocumentState {
  contract_body: string
  attachment_file: File | null
  attachment_url: string | null
}

export const EMPTY_LEGAL_DOCUMENT: LegalDocumentState = {
  contract_body: '',
  attachment_file: null,
  attachment_url: null,
}
