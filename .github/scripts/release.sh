#!/usr/bin/env bash
#
# Auto-tag + GitHub Release when the current version has no release yet. Run by
# the CI "release" job on a push to the default branch, AFTER the gate jobs pass
# — so only green commits are ever released.
#
# The tag is v<version> (from package.json), the release body is the matching
# "## [<version>]" section of CHANGELOG.md, and the package itself, packed by
# the job before this runs (jwill89-shared-components-vue-<version>.tgz), is
# attached. Apps install that file by its URL:
#   https://github.com/jwill89/shared-components-vue/releases/download/v<version>/jwill89-shared-components-vue-<version>.tgz
#
# Idempotent: a version already released is skipped, so ordinary pushes are a
# no-op, and so is 0.0.0, the version before the first release. When the git
# tag already exists (e.g. created by hand) but has no release, the release is
# attached to it; otherwise the tag is created at the pushed commit.
#
# With --check it releases nothing and prints `due=true` or `due=false` for
# $GITHUB_OUTPUT, so the job packs the package only when a release is due.
set -euo pipefail

check=false
if [ "${1:-}" = "--check" ]; then
  check=true
fi

# Whether this version still needs its release, said on stderr; the exit says it to the caller.
due() {
  if [ -z "$version" ]; then
    echo "!! Could not read a version from package.json — nothing to release" >&2
    return 1
  fi
  if [ "$version" = "0.0.0" ]; then
    echo "== 0.0.0: nothing released yet — skipping" >&2
    return 1
  fi
  if gh release view "v${version}" >/dev/null 2>&1; then
    echo "== v${version}: release already exists — skipping" >&2
    return 1
  fi
  return 0
}

version="$(jq -r '.version // empty' package.json || true)"

if $check; then
  if due; then echo "due=true"; else echo "due=false"; fi
  exit 0
fi

if ! due; then
  exit 0
fi
tag="v${version}"

tarball="jwill89-shared-components-vue-${version}.tgz"
if [ ! -f "$tarball" ]; then
  echo "!! ${tag}: ${tarball} is missing — the job packs it before releasing" >&2
  exit 1
fi

# The CHANGELOG "## [<version>]" section, up to the next "## " heading. index()
# is a literal (non-regex) substring match anchored at column 1, so the version
# dots are literal and the date separator after the bracket doesn't matter.
notes_file="$(mktemp)"
awk -v ver="## [${version}]" '
  index($0, ver)==1 { cap=1; print; next }
  cap && /^## / { cap=0 }
  cap { print }
' CHANGELOG.md > "$notes_file"
if [ ! -s "$notes_file" ]; then
  printf '_No CHANGELOG entry found for %s._\n' "$version" > "$notes_file"
  echo "!! ${tag}: no CHANGELOG section found — releasing with a placeholder" >&2
fi

if git rev-parse -q --verify "refs/tags/${tag}" >/dev/null 2>&1; then
  echo "++ ${tag}: tag exists, attaching a release"
  gh release create "$tag" --verify-tag --title "$tag" --notes-file "$notes_file" "$tarball"
else
  echo "++ ${tag}: creating tag + release at ${GITHUB_SHA}"
  gh release create "$tag" --target "$GITHUB_SHA" --title "$tag" --notes-file "$notes_file" "$tarball"
fi
