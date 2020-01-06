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

As described by MDN, a Promise has 3 possible states: Pending, Fulfilled and Rejected

[![](https://mdn.mozillademos.org/files/8633/promises.png)]()

But... We can't take a peek at a Promise status at any time without doing some hacking. 

This design choice makes sense for many applications but many times we need to know which is the state of our Promise after the associated callback was executed, which one of our promise batch has been rejected or systematically wait until a set of promises has been completed while using the responses as each of them is fulfilled...

So you might be thinking... If I know I will need the state of my promise afterwards, I could store that status in a variable. 

Yeah, okay, fair enough. But, what if you have a few dozen promises? You'd have to remember to save the status of each promise at their .done and .catch callbacks... Hello boilerplate code. This does not scale and it's prone to mistakes.

StatefulPromises solves that problem with some more thought put into it:

### Features

#### PromiseBatch

.promiseAll(concurrentLimit?: number): Your classic Promise.all() but: 

* saving all results no matter what
* in an object format using the name of each promise as a key instead of an array
* with a concurrency limit for specifying how many promises you want to execute at the same time

.promiseAny(concurrentLimit?: number): Same as promiseAll() but never throws an error. For providing seamless user experiences.

.retryRejected(): If when calling promiseALl() or promiseAny(), some promise failed, you may retry those automatically with this method. Ideal for automatic error recovery

.exec(): For executing a single promise. Behaves exactly as promiseAll and promiseAny and is added to a the associated batch

.isBatchCompleted(): Returns true once all the promises in the batch have been resolved or rejected

.isBatchFulfilled(): Once the batch is completed, it returns true if all promises were resolved and false if some had been rejected

.observeStatus(): Allows you to access the current status of any of the promises of your batch

.getStatusList(): Returns an object with the sttatuses of all promises in the batch. Each status property is a Knockout Observable variable


#### Full test suite:
* Almost a 100 automated tests ensure each commit works as intended


## Usage
**Usage with Typescript**

```typescript
import { PromiseBatch, ICustomPromise } from 'statefulpromises';

const getAllComics: ICustomPromise<Comic[]> = {
      name: 'GetAllComics',
      function: () => this.comicProvider.all().toPromise(),
      validate: (data) => Math.floor(Math.random() * 1000) % 2 === 0,
      doneCallback: (data) => {
        data[0].nombre = 'Modified by doneCallback';
        return data;
      },
      catchCallback: (data) => {
        data[0].nombre = 'Modified by catchCallback';
        return data;
      }
    };
    const promiseBatch = new PromiseBatch([getAllComics]);
    promiseBatch.exec(getAllComics).then((res) => {
      console.log('RESPONSE', res);
      this.allComics = res;
      this.comics = res;
      sessionStorage.setItem('comics', JSON.stringify(this.allComics));
      promiseBatch.finishPromise(getAllComics);
    }, res => {
      console.log('ERROR', res);
      this.allComics = res;
      this.comics = res;
      sessionStorage.setItem('comics', JSON.stringify(this.allComics));
      promiseBatch.finishPromise(getAllComics);
    });
    promiseBatch.isBatchCompleted().then((ready) => {
      console.log('COMPLETED', ready);
    });
    promiseBatch.isBatchFulfilled().then((ready) => {
      console.log('FULFILLED', ready);
    });
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
