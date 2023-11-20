# HOW TO

## Installation

```
cd run_trans
yarn install
cd .\app\renderer\src\main\
yarn install
```

## Steps

1. 

```
node index.js C:\Users\nguyen.anh.tien\lab\yakit\app\renderer\src\main\src\pages\vulinbox\VulinboxManager.tsx
```

`index.js` is the main traslation script, which add (some) `i18next.t` wrapper around Chinese texts.

```js
title: i18next.t("补全内容"),
```

Check for any unwrapped texts and add it manually. For template strings, check log and correct the placeholders.

Add one import to `i18next` if this is a new file:

Ex: 
```bash
import i18next from "../../i18n"
```

2. 

```
cd .\app\renderer\src\main\
yarn i18next-scanner
```

will add non-translated strings to `translations.json`


3. 

```bash
cd run_trans
node .\update.js ..\app\renderer\src\main\src\locales\en\translations.json
```

will replace non-translated strings in `translations.json` with Google translated texts. If you want to use other tools (ChatGPT), collect translated strings in to JSON and use `updateJSON.js`

```
node .\updateJSON.js ..\app\renderer\src\main\src\locales\en\translations.json partial_translated.json
```