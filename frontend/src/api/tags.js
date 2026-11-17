// Post tag rules, the same as the server's (backend/app/schemas/common.py): lower-case, no leading '#',
// letters/digits (any language) and dashes, starting with a letter or digit, up to 30 characters, at most 10.
export const MAX_TAGS = 10;
export const MAX_TAG_LENGTH = 30;

export function normalizeTag(raw) {
  const tag = String(raw).trim().replace(/^#+/, '').trim().toLowerCase();
  if (!tag) return { tag: '' };
  if (tag.length > MAX_TAG_LENGTH || !/^[\p{L}\p{N}][\p{L}\p{N}-]*$/u.test(tag)) {
    return { error: `"${String(raw).trim()}" can't be a tag: use letters, numbers and dashes (up to ${MAX_TAG_LENGTH}).` };
  }
  return { tag };
}
