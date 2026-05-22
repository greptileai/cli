#!/usr/bin/env bash
# Greptile CLI installer.
# Usage:   curl -fsSL https://greptile.com/install | bash
# Pinning: curl -fsSL https://greptile.com/install | GREPTILE_VERSION=v3.1.0 bash
# Destination override: GREPTILE_INSTALL_DIR=/usr/local/bin curl ... | bash
set -eu

REPO="greptileai/cli"
INSTALL_DIR="${GREPTILE_INSTALL_DIR:-$HOME/.greptile/bin}"
VERSION="${GREPTILE_VERSION:-latest}"

err() { printf '\033[31merror:\033[0m %s\n' "$1" >&2; exit 1; }
info() { printf '\033[36m==>\033[0m %s\n' "$1"; }

uname_s="$(uname -s)"
case "$uname_s" in
  Darwin) ;;
  Linux)  err "Linux installs are not supported yet. Build from source or wait for the next release." ;;
  *)      err "Unsupported OS: $uname_s." ;;
esac

if ! command -v node >/dev/null 2>&1; then
  err "greptile needs Node.js 22+. Install with: brew install node  (or https://nodejs.org/)"
fi

node_major="$(node -e 'process.stdout.write(process.versions.node.split(".")[0])')"
if [ "${node_major}" -lt 22 ]; then
  err "greptile needs Node.js 22+ (you have ${node_major}). Upgrade and re-run."
fi

# Resolve the version tag by following the redirect from /releases/latest.
# Avoids the GitHub API rate limit (60/hr unauthenticated) and needs no jq.
if [ "$VERSION" = "latest" ]; then
  redirect="$(curl -sIL -o /dev/null -w '%{url_effective}' "https://github.com/${REPO}/releases/latest")"
  VERSION="${redirect##*/}"
  if [ -z "$VERSION" ] || [ "$VERSION" = "latest" ]; then
    err "Could not resolve the latest greptile release. Set GREPTILE_VERSION to pin a version."
  fi
fi

ARTIFACT_URL="https://github.com/${REPO}/releases/download/${VERSION}/greptile.js"
DEST="${INSTALL_DIR}/greptile"

info "Installing greptile ${VERSION} into ${INSTALL_DIR}"
mkdir -p "$INSTALL_DIR"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
if ! curl -fsSL "$ARTIFACT_URL" -o "$TMP"; then
  err "Download failed: ${ARTIFACT_URL}"
fi
mv "$TMP" "$DEST"
chmod +x "$DEST"
trap - EXIT

info "Installed at ${DEST}"

case ":${PATH}:" in
  *":${INSTALL_DIR}:"*) ;;
  *)
    printf '\n'
    info "Add ${INSTALL_DIR} to your PATH so the greptile command is on it:"
    case "${SHELL:-}" in
      *fish)
        printf '    fish_add_path %s\n' "$INSTALL_DIR"
        ;;
      *zsh)
        printf '    echo '\''export PATH="%s:$PATH"'\'' >> ~/.zshrc\n' "$INSTALL_DIR"
        ;;
      *bash)
        printf '    echo '\''export PATH="%s:$PATH"'\'' >> ~/.bashrc\n' "$INSTALL_DIR"
        ;;
      *)
        printf '    export PATH="%s:$PATH"\n' "$INSTALL_DIR"
        ;;
    esac
    ;;
esac

printf '\nRun '\''greptile login'\'' to sign in.\n'
