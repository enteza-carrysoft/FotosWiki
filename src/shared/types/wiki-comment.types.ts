export interface WikiComment {
  author: string
  text: string
  date: string
}

export interface PostCommentResult {
  ok: boolean
  error?: string
  comment?: WikiComment
}
