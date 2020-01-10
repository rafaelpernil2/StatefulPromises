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
- [Why?](#Why?)
- [Features](#Features)
- [API](#API)
  - [ICustomPromise\<T\>](#ICustomPromise\<T\>)
  - [PromiseBatch](#PromiseBatch)
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

StatefulPromises solves that problem with some more thought put into it.

## Features

* Execution of promise batches:
  * One by one
  * Concurrently limited with promiseAll and promiseAny
  * Optional result caching for independently defined callbacks
  * Independent promise validation
  * Independent done and catch callbacks
  * Access to promise status at any time

* Automated Test Suite: Almost a 100 automated tests ensure each commit works as intended

* Full type safety: Generic methods and interfaces to type your Promises accordingly

## API

### ICustomPromise\<T\>

#### name

Specifies the name of the custom promise

#### function(...args: any[]): PromiseLike\<T\>

Specifies the function to be called, that has to return a `PromiseLike<T>`, being T the parameter of the interface

These two properties are mandatory. Here is an example:
```typescript
const customPromise: ICustomPromise<string> = {
  name: 'HelloPromise',
  function: () => Promise.resolve('Hello World!')
};
```

#### thisArg

Specifies the context of the function

Example:
```typescript
const customPromise: ICustomPromise<number> = {
  name: 'CountStars',
  thisArg: this.starProvider,
  function: this.starProvider.getCount
};
```

#### args

Specifies the arguments to pass to the function

Example:
```typescript
const customPromise: ICustomPromise<number> = {
  name: 'GetStarByPlanetarySystem',
  thisArg: this.starProvider,
  args: [this.currentSystem],
  function: this.starProvider.getStarBySystem
};
```

#### cached

Determines if posterior executions, the stateful promise execution returns an initialy cached value or `undefined`.
When this value is not specified, it always returns `undefined` in posterior executions.

Default behaviour:
```typescript
const uncachedPromise: ICustomPromise<string> = {
  name: 'HelloPromiseUncached',
  cached: false, // It's the same as not specifying it
  function: () => Promise.resolve('Hello World!')
};

const uncached1 = await promiseBatch.exec(uncachedPromise); // uncached1 = 'Hello World!'
const uncached2 = await promiseBatch.exec(uncachedPromise); // uncached2 = undefined
```

Example with `cached = true`:
```typescript
const promiseBatch = new PromiseBatch();

const cachedPromise: ICustomPromise<string> = {
  name: 'HelloPromiseCached',
  cached: true,
  function: () => Promise.resolve('Hello World!')
};

const cached1 = await promiseBatch.exec(cachedPromise); // cached1 = 'Hello World!'
const cached2 = await promiseBatch.exec(cachedPromise); // cached2 = 'Hello World!'
```


#### validate?(response: T): boolean

This function validates the response of the function to determine if it should be rejected. The `response` parameter cannot be modified.

Example:
```typescript
const customPromise: ICustomPromise<string> = {
  name: 'CheckLights',
  thisArg: this.lightProvider,
  function: this.lightProvider.checkLights,
  validate: (response: string) => response === 'BLINK' || response === 'STROBE'
};

promiseBatch.exec(customPromise).then((response)=>{
  // This block is executed if the response IS 'BLINK' or 'STROBE'
},
(error)=>{
  // This block is executed if the response IS NOT 'BLINK' or 'STROBE'
});

```

#### doneCallback?(response: T): T

This function is executed when the promise is valid (validate returns true) and was fulfilled previously

Example:
```typescript
const customPromise: ICustomPromise<string> = {
  name: 'CheckLights',
  thisArg: this.lightProvider,
  function: this.lightProvider.checkLights,
  validate: (response: string) => response === 'BLINK' || response === 'STROBE',
  doneCallback: (response: string) => 'Light status: ' + response
};
// Let's imagine this function returns BLINK...
promiseBatch.exec(customPromise).then((response)=>{
  // response = 'Light status: BLINK'
},
(error)=>{
  // This block is not executed
});
```

#### catchCallback?(error: any): any

This function is executed when the promise is invalid (validate returns false) or was rejected previously

Example:
```typescript
const customPromise: ICustomPromise<string> = {
  name: 'CheckLights',
  thisArg: this.lightProvider,
  function: this.lightProvider.checkLights,
  validate: (response: string) => response === 'BLINK' || response === 'STROBE',
  doneCallback: (response: string) => 'Light status: ' + response,
  catchCallback: (error: string) => 'Failure: ' + error
};
// Let's imagine this function returns OFF...
promiseBatch.exec(customPromise).then((response)=>{
  // This block is not executed
},
(error)=>{
  // error = 'Failure: OFF'
});
```

### PromiseBatch

Initialization:

```typescript
const promiseBatch = new PromiseBatch(yourCustomPromiseArray); // The parameter is optional
```

#### .add<T>(customPromise: ICustomPromise<T>)

Adds a single `ICustomPromise<T>` to the batch, with T being the type of the promise


Example:
```typescript
const customPromise: ICustomPromise<string> = {
  name: 'HelloPromise',
  function: () => Promise.resolve('Hello World!')
};
promiseBatch.add(customPromise);
```


#### .addList(customPromiseList: Array<ICustomPromise<unknown>>)

Adds an array of `ICustomPromise<unknown>` to the batch

Example:
```typescript
const customPromiseList= [
  {
    name: 'HelloPromise',
    function: () => Promise.resolve('Hello World!')
  },
  {
    name: 'GoodbyePromise',
    function: () => Promise.resolve('Goodbye World!')
  }
];
promiseBatch.addList(customPromiseList);
```

#### .promiseAll(concurrentLimit?: number): 

Your classic Promise.all() but: 

* Saving all results no matter what
* Saving all results in an object format using the name of each promise as a key instead of an array
* With an optional concurrency limit for specifying how many promises you want to execute at the same time

Example:
```typescript
const concurrentLimit = 2; // Executes at maximum 2 promises at a time
promiseBatch.promiseAll(concurrentLimit).then((response)=>{
  // response = { HelloPromise: "Hello World!', GoodbyePromise: "Goodbye World!" }
}, (error)=>{
  // error = Some promise was rejected: RejectPromise
});
```

#### .promiseAny(concurrentLimit?: number): 

Same as promiseAll() but never throws an error. For providing seamless user experiences.

Example:
```typescript
const concurrentLimit = 2; // Executes at maximum 2 promises at a time
promiseBatch.promiseAny(concurrentLimit).then((response)=>{
  // response = { HelloPromise: "Hello World!', GoodbyePromise: "Goodbye World!" }
}, (error)=>{
  // This is never executed. If you see an error here, it means this library is not working as intended
});
```

#### .retryRejected(concurrentLimit?: number): 

If when calling promiseAll() or promiseAny(), some promise failed, you may retry those automatically with this method. Ideal for automatic error recovery

Example:
```typescript
const concurrentLimit = 2; // Executes at maximum 2 promises at a time
promiseBatch.promiseAll().catch((error)=>{
  // Some promise was rejected: RejectPromise

  // Maybe it was due to a data issue or a network issue, so, we can try to fix the issue and try again
  customPromiseList[0].args = ["Now it's ok"];

  promiseBatch.retryRejected(concurrentLimit).then(...) // Same as promiseAll
});
```

#### .exec\<T\>(nameOrCustomPromise: string | ICustomPromise\<T\>): 

For executing a single promise. Behaves exactly as promiseAll and promiseAny and the promise and its result is added to a the associated batch

Example:
```typescript
const helloPromise = {
    name: 'HelloPromise',
    function: () => Promise.resolve('Hello World!')
  };
const goodbyePromise = {
    name: 'GoodbyePromise',
    function: () => Promise.reject('Goodbye World!')
  };
promiseBatch.add(goodbyePromise);
promiseBatch.exec(helloPromise).then((result)=>{
  // result = 'Hello World!'
}, (error)=>{
  // Nothing
});

promiseBatch.exec('GoodbyePromise').then((result)=>{
  // Nothing
}, (error)=>{
  // error = 'Goodbye World!'
});
```

#### .isBatchCompleted():

Returns true once all the promises in the batch have been resolved or rejected

Example:
```typescript
promiseBatch.promiseAll(); // Executing...
promiseBatch.isBatchCompleted().then((response)=>{
  // Once the set of promises has been completed, i.e, it is resolved or rejected...
  // response = true
});
```

#### .isBatchFulfilled():

Once the batch is completed, it returns true if all promises were resolved and false if some had been rejected

Example:
```typescript
promiseBatch.promiseAll(); // Executing...
promiseBatch.isBatchCompleted().then((response)=>{
  // Once the set of promises has been completed, i.e, it is resolved or rejected...
  // response = true
});
promiseBatch.isBatchFulfilled().then((response)=>{
  // If all are fulfilled, true, else, false. isBatchCompleted has to be true to return anything.
  // response = true
});
```

#### .observeStatus(promiseName: string):

Allows you to access the current status of any of the promises of your batch

Example:
```typescript
promiseBatch.promiseAll().then((response)=>{
  promiseBatch.observeStatus('HelloPromise'); // status = 'f'
}); 
const status = promiseBatch.observeStatus('HelloPromise'); // status = 'p' 
```

#### .getStatusList():

Returns an object with the sttatuses of all promises in the batch. Each status property is a Knockout Observable variable

Example:
```typescript
const statusList = promiseBatch.getStatusList(): // statusList = { HelloPromise: ko.observable(...), GoodbyePromise: ko.observable(...) }
```

## Usage
**Usage with Typescript**

```typescript
import { PromiseBatch, ICustomPromise } from 'stateful-promises';

type Comic = {
    nombre: string;
}

let allComics = [];

const getAllComics: ICustomPromise<Comic[]> = {
      name: 'GetAllComics',
      function: () => Promise.resolve([{ nombre: "SuperComic" }, {nombre: "OtroComic"}]),
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
  allComics = res;
  console.log("OK",allComics);
  promiseBatch.finishPromise(getAllComics);
}, error => {
  allComics = error;
  console.log("ERROR",allComics);
  promiseBatch.finishPromise(getAllComics);
});
promiseBatch.isBatchCompleted().then((ready) => {
  console.log('COMPLETED', ready);
});
promiseBatch.isBatchFulfilled().then((ready) => {
  console.log('FULFILLED', ready);
});

// CONSOLE LOG

/**
 * COMPLETED true
 * FULFILLED true
 * OK [ { nombre: 'Modified by doneCallback' }, { nombre: 'OtroComic' } ]
 */

/**
 * COMPLETED true
 * FULFILLED false
 * ERROR [ { nombre: 'Modified by catchCallback' }, { nombre: 'OtroComic' } ]
 */
```

**Usage with Javascript**
```javascript
const { PromiseBatch: PromiseBatch } = require("stateful-promises");
// or const StatefulPromises = require("stateful-promises");
// and then... new StatefulPromises.PromiseBatch()

let allComics = [];

const getAllComics = {
  name: "GetAllComics",
  function: () => Promise.resolve([{ nombre: "SuperComic" }, {nombre: "OtroComic"}]),
  validate: data => Math.floor(Math.random() * 1000) % 2 === 0,
  doneCallback: data => {
    data[0].nombre = "Modified by doneCallback";
    return data;
  },
  catchCallback: data => {
    data[0].nombre = "Modified by catchCallback";
    return data;
  }
};
const promiseBatch = new PromiseBatch([getAllComics]);
promiseBatch.exec(getAllComics).then(
  res => {
    allComics = res;
    console.log("OK",allComics);
    promiseBatch.finishPromise(getAllComics);
  },
  error => {
    allComics = error;
    console.log("ERROR", allComics);
    promiseBatch.finishPromise(getAllComics);
  }
);
promiseBatch.isBatchCompleted().then(ready => {
  console.log("COMPLETED", ready);
});
promiseBatch.isBatchFulfilled().then(ready => {
  console.log("FULFILLED", ready);
});

// CONSOLE LOG

/**
 * COMPLETED true
 * FULFILLED true
 * OK [ { nombre: 'Modified by doneCallback' }, { nombre: 'OtroComic' } ]
 */

/**
 * COMPLETED true
 * FULFILLED false
 * ERROR [ { nombre: 'Modified by catchCallback' }, { nombre: 'OtroComic' } ]
 */
```

## Contributing
There is no plan regarding contributions in this project
## Credits
This NPM package has been developed by:

**Rafael Pernil Bronchalo** - *Developer*

* [github/rafaelpernil2](https://github.com/rafaelpernil2)

## License
This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
