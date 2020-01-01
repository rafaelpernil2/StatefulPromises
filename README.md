# StatefulPromises

[![Actions Status](https://github.com/rafaelpernil2/StatefulPromises/workflows/ci/badge.svg)](https://github.com/rafaelpernil2/StatefulPromises/actions)
[![BCH compliance](https://bettercodehub.com/edge/badge/rafaelpernil2/StatefulPromises?branch=master)](https://bettercodehub.com/)
[![npm version](https://badge.fury.io/js/stateful-promises.svg)](https://badge.fury.io/js/stateful-promises)
[![](https://badgen.net/badge/icon/TypeScript?icon=typescript&label)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

StatefulPromises is an NPM package implemented in Typescript using Knockout 3.5 for working with promises statefully.

This project is an extension of ParallelPromises

## Table of Contents
- [Installation](#installation)
- [Why?](#why?)
- [Usage](#usage)
- [Contributing](#contributing)
- [Credits](#credits)
- [License](#license)

## Installation

Install it on your project
```Shell
npm install --save stateful-promises
```


## Why?

As described by MDN, a Promise has 3 possible states: Pending, Resolved and Rejected

[![](https://mdn.mozillademos.org/files/8633/promises.png)]()

But... We can't take a peek at a Promise status at any time without doing some hacking. 

This design choice makes sense for many applications but many times we need to know which is the state of our Promise after the associated callback was executed, which one of our promise batch has been rejected or systematically wait until a set of promises has been completed while using the responses as each of them is resolved...

So you might be thinking... If I know I will need the state of my promise afterwards, I could store that status in a variable. 

Yeah, okay, fair enough. But, what if you have a few dozen promises? You'd have to remember to save the status of each promise at their .done and .catch callbacks... Hello boilerplate code. This does not scale and it's prone to mistakes.

StatefulPromises solves that problem with some more thought put into it





## Usage
**Usage with Typescript**

```typescript
```

**Usage with Javascript**
```javascript
```

## Contributing
There is no plan regarding contributions in this project
## Credits
This NPM package has been developed by:

**Rafael Pernil Bronchalo** - *Developer*

* [github/rafaelpernil2](https://github.com/rafaelpernil2)

## License
This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
