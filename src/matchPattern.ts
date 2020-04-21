export function matchPattern (pattern: string, str: string): Boolean {
  // Now concat all wordBoundaryTerms (terms with boundary checks added where appropriate) and match across entire text.
  // We only care whether a single instance is found at all, so a global search is not necessary and the first capture group is returned.
  const matches = str.match(
    new RegExp(`(${pattern})`, 'i')
  )
  return matches != null && matches?.length > 0
}
