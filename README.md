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

- [ ] Validate inputs (ex: notes without fields, permission delete)
- [ ] Passport google login

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
- [ ] Refactor css
- [ ] Export with groups & panels
- [ ] Split board.module
- [ ] Deprecated RX operators
- [ ] Code linter
- [ ] Board screenshot
- [ ] More login options
