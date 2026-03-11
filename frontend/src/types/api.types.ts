// ---------------------------------------------------------------------------
// API response envelope types
// ---------------------------------------------------------------------------

export interface ApiSuccess<T> {
  success: true
  data:    T
}

export interface ApiError {
  success: false
  error:   string
  details?: unknown
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

/** Pagination metadata */
export interface PaginationMeta {
  total:    number
  page:     number
  pageSize: number
  pages:    number
}

export interface PaginatedResponse<T> extends ApiSuccess<T[]> {
  meta: PaginationMeta
}
