# Greptile CLI

The command-line interface for [Greptile](https://greptile.com) code review.
This repository hosts the published binary and installer; source will be opened
later in beta.

## Install

```sh
# macOS via Homebrew
brew install greptileai/tap/greptile

# Any platform via npm
npm install -g greptile

# Direct installer (requires Node 22+)
curl -fsSL https://raw.githubusercontent.com/greptileai/cli/main/install.sh | bash
```

## Use

```sh
greptile login
greptile review
```

See `greptile --help` for the full command surface.

## License

MIT
