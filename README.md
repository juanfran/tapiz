# TeamUp

TeamUp is a web based colaborative board to helps teams in their online meetings.

![Demo](https://github.com/juanfran/team-up/blob/main/resources/demo-teamup-new.gif)

## Setup

```console
npm run config-files

# Edit apps/api/src/app/config.ts

npm run start:docker
npm run regenerate:db
```

## Run Team-up

```console
npm run start
npm run start:api
```

## TODO before beta release

- [ ] Page 404
- [ ] Show if the user is connected to the board
- [ ] Add emojis to notes
- [ ] Deprecated RX operators
- [ ] Api error handling
- [ ] Code linter
- [ ] Improve text ux

## Post release

- [ ] Multilanguage
- [ ] Shapes
- [ ] Templates
- [ ] Drawing
- [ ] Timer
- [ ] Vote counter
- [ ] Duplicate board
- [ ] Permissions
- [ ] Refactor toolbar
- [ ] Export with groups & panels
