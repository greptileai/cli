#!/usr/bin/env bash
# Greptile CLI installer.
#
# By default we delegate to Homebrew or npm if either is on PATH so updates,
# uninstalls, and version pinning work the way you'd expect from a package
# manager. Force a specific path with GREPTILE_INSTALL_METHOD:
#   - brew    use Homebrew (greptileai/tap/greptile)
#   - npm     use npm install -g
#   - direct  download the prebuilt JS bundle into ~/.greptile/bin/
#   - auto    pick the first available of brew, npm, direct (default)
#
# Usage:   curl -fsSL https://raw.githubusercontent.com/greptileai/cli/main/install.sh | bash
# Pinning: curl -fsSL https://raw.githubusercontent.com/greptileai/cli/main/install.sh | GREPTILE_VERSION=v3.0.1 bash
# Direct:  curl -fsSL https://raw.githubusercontent.com/greptileai/cli/main/install.sh | GREPTILE_INSTALL_METHOD=direct bash
# Destination override (direct only): GREPTILE_INSTALL_DIR=/usr/local/bin curl ... | bash
set -eu

REPO="greptileai/cli"
INSTALL_DIR="${GREPTILE_INSTALL_DIR:-$HOME/.greptile/bin}"
VERSION="${GREPTILE_VERSION:-latest}"
METHOD="${GREPTILE_INSTALL_METHOD:-auto}"

err() { printf '\033[31merror:\033[0m %s\n' "$1" >&2; exit 1; }
info() { printf '\033[36m==>\033[0m %s\n' "$1"; }

uname_s="$(uname -s)"
case "$uname_s" in
  Darwin|Linux) ;;
  *) err "Unsupported OS: $uname_s." ;;
esac

if [ "$METHOD" = "auto" ]; then
  if command -v brew >/dev/null 2>&1; then
    METHOD=brew
  elif command -v npm >/dev/null 2>&1; then
    METHOD=npm
  else
    METHOD=direct
  fi
fi

case "$METHOD" in
  brew)
    # `brew install` errors when the formula is already installed; treat the
    # installer as idempotent and upgrade in place instead.
    if brew list --formula greptileai/tap/greptile >/dev/null 2>&1; then
      info "greptile already installed via Homebrew, upgrading"
      brew upgrade greptileai/tap/greptile || info "Already at the latest version."
    else
      info "Installing via Homebrew"
      brew install greptileai/tap/greptile
    fi
    exit 0
    ;;
  npm)
    info "Installing via npm"
    # npm install -g is already idempotent: same version is a noop, older
    # version upgrades in place.
    if [ "$VERSION" = "latest" ]; then
      npm install -g greptile
    else
      npm install -g "greptile@${VERSION#v}"
    fi
    exit 0
    ;;
  direct)
    ;;
  *)
    err "Unknown GREPTILE_INSTALL_METHOD: $METHOD (use auto, brew, npm, or direct)"
    ;;
esac

# Direct path: download the JS bundle from GitHub Releases.

if ! command -v node >/dev/null 2>&1; then
  err "greptile needs Node.js 22+ for the direct install. Install Node, or re-run with GREPTILE_INSTALL_METHOD=brew."
fi

node_major="$(node -e 'process.stdout.write(process.versions.node.split(".")[0])')"
if [ "$node_major" -lt 22 ]; then
  err "greptile needs Node.js 22+ (you have $node_major). Upgrade and re-run."
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
TARGET_VERSION="${VERSION#v}"

# Skip the download (and the 10 MB it carries) if the existing binary already
# reports the target version. Best-effort: any parse mismatch falls through.
if [ -x "$DEST" ]; then
  current="$("$DEST" --help 2>&1 | grep -oE 'greptile v[0-9.]+' | head -1 | sed 's/greptile v//')" || true
  if [ -n "${current:-}" ] && [ "$current" = "$TARGET_VERSION" ]; then
    info "greptile v$TARGET_VERSION already installed at $DEST"
    exit 0
  fi
fi

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
