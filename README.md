# TeamUp

TeamUp is a web based collaborative board to help teams in their online meetings & projects.

![Demo](https://github.com/juanfran/team-up/blob/main/resources/demo-teamup-new.gif)

## Requirements

- Node >= 18
- Docker

## Setup

```console
cp .env.example .env
# Edit .env
npm run start:docker
npm run regenerate
```

## Run Team-up

```console
npm run start
npm run start:api
```

## Current status

This is an alpha release and not yet ready for production use. Please open an issue with feedback about the current features and any issues you encounter. Let us know if you have any suggestions for new features.

## TODO

- [ ] Multilanguage
- [ ] Shapes
- [ ] Templates
- [ ] Timer
- [ ] Vote counter
- [ ] Duplicate board
- [ ] Permissions
- [ ] Refactor toolbar
- [ ] Refactor css
- [ ] Export with groups & panels
- [ ] Split board.module
- [ ] Deprecated RX operators
- [ ] Code linter
- [ ] Board screenshot
- [ ] More login options
- [ ] Board Size limit
- [ ] Multi board (one board with multiples ¿views?, easy to move between phases in retrospectives)
- [ ] Board links (move your board to previous store prosition)
- [ ] Search
- [ ] Improve docker
