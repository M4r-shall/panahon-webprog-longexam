/**
 * Helpers for turning untrusted query input into something safe to hand to Mongo.
 *
 * Two problems these solve:
 *   1. Express parses `?search[$ne]=x` into an object, which would reach the query
 *      builder as a Mongo operator instead of a value.
 *   2. User text dropped straight into `$regex` (or `new RegExp`) lets a visitor
 *      crash the endpoint with `?search=[` or match everything with `?category=.*`.
 */

/** Coerces any query value to a plain trimmed string. Objects/arrays become ''. */
const toSearchString = (value) => {
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return '';
};

/** Escapes every regex metacharacter so the input is matched literally. */
const escapeRegex = (value) => toSearchString(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Builds a safe case-insensitive "contains" matcher, or null when there is nothing to search. */
const containsMatcher = (value) => {
    const escaped = escapeRegex(value);
    return escaped ? { $regex: escaped, $options: 'i' } : null;
};

/** Builds a safe case-insensitive exact matcher. */
const exactMatcher = (value) => {
    const escaped = escapeRegex(value);
    return escaped ? { $regex: `^${escaped}$`, $options: 'i' } : null;
};

/** Only lets a value through when it is one of the allowed literals. */
const oneOf = (value, allowed) => (allowed.includes(value) ? value : undefined);

module.exports = { toSearchString, escapeRegex, containsMatcher, exactMatcher, oneOf };
