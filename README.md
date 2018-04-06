# macleod

mono repo publishing made easy.

[![js-standard-style](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://github.com/feross/standard)
[![downloads](https://img.shields.io/npm/dm/macleod.svg)](https://npmjs.org/package/macleod)
[![Greenkeeper badge](https://badges.greenkeeper.io/JamesKyburz/macleod.svg)](https://greenkeeper.io/)

# assumptions

* your mono repo has it's packages stored in ./packages
* all your packages will have the same version number
* you are ok with a single commit message + git tag for the update

# usage

```sh
ᐅ macleod exec npm t # will run npm run t in all packages
ᐅ macleod exec npx standard # will run npx standard in all packages
ᐅ macleod publish x # will npm publish all your packages in the correct order
ᐅ macleod publish patch # will increment version using npm version patch
```

# license

[Apache License, Version 2.0](LICENSE)
