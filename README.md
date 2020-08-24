# StatefulPromises

[![Actions Status](https://github.com/rafaelpernil2/StatefulPromises/workflows/ci/badge.svg)](https://github.com/rafaelpernil2/StatefulPromises/actions)
[![BCH compliance](https://bettercodehub.com/edge/badge/rafaelpernil2/StatefulPromises?branch=master)](https://bettercodehub.com/)
[![npm version](https://badge.fury.io/js/stateful-promises.svg)](https://badge.fury.io/js/stateful-promises)
[![](https://badgen.net/badge/icon/TypeScript?icon=typescript&label)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

StatefulPromises is an NPM package implemented in Typescript using Knockout 3.5 for working with promises statefully.

This project is an extension of [rafaelpernil2/ParallelPromises](https://github.com/rafaelpernil2/ParalellPromises).

## Table of Contents
- [Installation](#installation)
- [Why?](#why)
- [Features](#features)
- [API](#api)
  - [ICustomPromise\<T\>](#icustompromiset)
  - [PromiseBatch](#promisebatch)
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

As described by MDN, a Promise has 3 possible states: Pending, Fulfilled and Rejected.

[![](https://mdn.mozillademos.org/files/8633/promises.png)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise).

But... We can't take a peek at a Promise status at any time without doing some hacking.

This design choice makes sense for many applications but many times we need to know which is the state of our Promise after `.then` was executed, which one of our promise batch has been rejected or systematically wait until a set of promises has been completed while using the responses as each of them is fulfilled...

So you might be thinking... If I know I will need the state of my promise afterwards, I could store that status in a variable.

Yeah, okay, fair enough. But, what if you have a few dozen promises? You'd have to remember to save the status of each promise at their fulfilled and rejected callbacks... Hello boilerplate code. This does not scale and it's prone to mistakes.

StatefulPromises solves that problem with some more thought put into it.

## Features

* Custom interface to extend [JS Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) functionality and syntax (see [ICustomPromise\<T\>](#icustompromiset))
* Execution of single-use custom promise batches:
  * One by one with [exec](#exectnameorcustompromise-string--icustompromiset).
  * Concurrently limited with [all](#allconcurrencyLimit-number) and [allSettled](#allSettledconcurrencyLimit-number).
  * Optional result caching for independently defined callbacks (when using exec, check [cached](#cached)).
  * Independent custom promise validation with [validate](#validateresponse-t-boolean).
  * Independent [done](#donecallbackresponse-t-t) and [catch](#catchcallbackerror-any-any) callbacks.
  * Access to custom promise status at any time with [observeStatus](#observestatusnameorcustompromise-string--icustompromiseunknown).

* Automated Test Suite: 72 automated tests ensure each commit works as intended through [Github Actions](https://github.com/rafaelpernil2/StatefulPromises/actions). Feel free to run the tests locally by executing `npm run test`

* Full type safety: Generic methods and interfaces like [ICustomPromise\<T\>](#icustompromiset) to type your Promises accordingly.

## API

### ICustomPromise\<T\>

This interface defines the basic type for interacting with promises statefully. The type variable `T` defines the type of your function returning a `PromiseLike`.
PromiseLike is the less strict version of the Promise type, thus allowing the usage of JQuery Promises or other implementations.

#### name

Specifies the name of the custom promise.

#### function(...args: any[]): PromiseLike\<T\>

Specifies the function to be called, that has to return a `PromiseLike<T>`, being T the parameter of the interface.

These two properties are mandatory. Here is an example:
```typescript
const customPromise: ICustomPromise<string> = {
  name: 'HelloPromise',
  function: () => Promise.resolve('Hello World!')
};
```

#### thisArg

Specifies the context of the function. See [this](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this) documentation by MDN.

##### Example:
```typescript
const customPromise: ICustomPromise<number> = {
  name: 'CountStars',
  thisArg: this.starProvider,
  function: this.starProvider.getCount
};
```

#### args

Specifies the arguments to pass to the function in an array format.

##### Example:

Let's imagine `this.starProvider.getStarBySystem(currentSystem,namingConvention)` has two arguments, `currentSystem` and `namingConvention`.

```typescript
const customPromise: ICustomPromise<number> = {
  name: 'GetStarByPlanetarySystem',
  thisArg: this.starProvider,
  args: [this.currentSystem, this.namingConvention],
  function: this.starProvider.getStarBySystem
};
```

#### cached

Determines if future executions of this custom promise return a value cached in the first execution or `undefined`.
When this value is not specified, it always returns `undefined` in future executions.

Default behaviour:
```typescript
const customPromise: ICustomPromise<string> = {
  name: 'HelloPromiseUncached',
  cached: false, // It's the same as not specifying it
  function: () => Promise.resolve('Hello World!')
};

const firstExec = await promiseBatch.exec(customPromise); // firstExec = 'Hello World!'
const secondExec = await promiseBatch.exec(customPromise); // secondExec = undefined
```

Example with `cached = true`:
```typescript
const customPromise: ICustomPromise<string> = {
  name: 'HelloPromiseCached',
  cached: true,
  function: () => Promise.resolve('Hello World!')
};

const firstExec = await promiseBatch.exec(customPromise); // firstExec = 'Hello World!'
const secondExec = await promiseBatch.exec(customPromise); // secondExec = 'Hello World!'
```


#### validate?(response: T): boolean

This function validates the response of the function to determine if it should be rejected. The `response` parameter cannot be modified.

##### Example:
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

This function is executed when the custom promise is fulfilled and valid (validate returns true). The syntax is inspired by JQuery Promises.

##### Example:
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

This function is executed when the custom promise is rejected or invalid (validate returns false).

##### Example:
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

#### finallyCallback?(response: any): any

This function is always executed after fulfillment or rejection. The syntax is inspired by JQuery Promises.

##### Example:
```typescript
const customPromise: ICustomPromise<string> = {
  name: 'CheckLights',
  thisArg: this.lightProvider,
  function: this.lightProvider.checkLights,
  validate: (response: string) => response === 'BLINK' || response === 'STROBE',
  doneCallback: (response: string) => 'Light status: ' + response,
  catchCallback: (error: string) => 'Failure: ' + error,
  finallyCallback: (response: string) => 'Overall status: { ' + response + ' }'
};
// Let's imagine this function returns BLINK...
promiseBatch.exec(customPromise).then((response)=>{
  // response = 'Overall status: { Light status: BLINK }'
},
(error)=>{
  // This block is not executed
});
```

### PromiseBatch

This class provides a set of methods for working statefully with a single use set of Promises. Each PromiseBatch has a set of customPromises to execute either using [exec](#exectnameorcustompromise-string--icustompromiset) for individual execution, [all](#allconcurrencyLimit-number) or [allSettled](#allSettledconcurrencyLimit-number) for batch execution, while providing methods to retry failed promises, check statuses or notify promises as finished for making sure all `.then` post-processing is done without race conditions.

By desing, it is a single use batch to avoid expensive calls to functions when the current result is already loaded and remains valid. Also, it allows to keep track of different sets of executions thus creating a more organized code base.


##### Initialization:

```typescript
const promiseBatch = new PromiseBatch(yourCustomPromiseArray: Array<ICustomPromise<unknown>>); // The parameter is optional
```


#### add\<T\>(customPromise: ICustomPromise\<T\>)

Adds a single [ICustomPromise\<T\>](#icustompromiset) to the batch, with T being the type of the promise.


##### Example:
```typescript
const customPromise: ICustomPromise<string> = {
  name: 'HelloPromise',
  function: () => Promise.resolve('Hello World!')
};
promiseBatch.add(customPromise);
```


#### remove(nameOrCustomPromise: string | ICustomPromise\<unknown\>)

Removes a custom promise of the batch given a custom promise or the name of a custom promise inside the batch.


##### Example:
```typescript
const customPromise: ICustomPromise<string> = {
  name: 'HelloPromise',
  function: () => Promise.resolve('Hello World!')
};
promiseBatch.remove(customPromise);
promiseBatch.remove('GoodbyePromise');
```


#### addList(customPromiseList: Array\<ICustomPromise\<unknown\>\>)

Adds an array of [ICustomPromise\<unknown\>](#icustompromiset) to the batch. This means that all promises in the array can have different response types, which can be individually narrowed at further points in the code.


##### Example:
```typescript
const customPromiseList: ICustomPromise<unknown>= [
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


#### getCustomPromiseList()

Returns the list of custom promises previously added using [add](#addtcustompromise-icustompromiset) or [addList](#addlistcustompromiselist-arrayicustompromiseunknown) or at [initialization](#initialization)

##### Example:
```typescript
const customPromiseList: ICustomPromise<unknown>= [
  {
    name: 'HelloPromise',
    function: () => Promise.resolve('Hello World!')
  },
  {
    name: 'GoodbyePromise',
    function: () => Promise.resolve('Goodbye World!')
  }
];
const anotherPromise: ICustomPromise<string>= {
  name: 'AnotherPromise',
  function: () => Promise.resolve('Another')
}
promiseBatch.add(anotherPromise)
promiseBatch.addList(customPromiseList);
const result = promiseBatch.getCustomPromiseList();
// [
//   {
//     name: 'HelloPromise',
//     function: () => Promise.resolve('Hello World!')
//   },
//   {
//     name: 'GoodbyePromise',
//     function: () => Promise.resolve('Goodbye World!')
//   }
//   {
//     name: 'AnotherPromise',
//     function: () => Promise.resolve('Another')
//   }
// ];
```


#### all(concurrencyLimit?: number)

Your classic Promise.all() but:

* Saves all results no matter what.
* Saves all results in an object using the name of each custom promise as a key instead of an array.
* Provides an optional concurrency limit for specifying how many promises you want to execute in parallel.
* Throws an error describing which promises have been rejected

##### Important note:

> This operation finishes all promises automatically (see [finishPromise](#finishpromisetnameorcustompromise-string--icustompromiset)), so if you need to handle each custom promise response individually, you MUST use [doneCallback](#donecallbackresponse-t-t) or [catchCallback](#catchcallbackerror-any-any).

##### Example:
```typescript
const concurrencyLimit = 2; // Executes at maximum 2 promises at a time
promiseBatch.all(concurrencyLimit).then((response)=>{
  // response = { HelloPromise: "Hello World!', GoodbyePromise: "Goodbye World!" }
}, (error)=>{
  // error = Some custom promise was rejected: RejectPromise
  promiseBatch.getBatchResponse() // Even if some custom promise was rejected, getBatchResponse contains all fulfilled promises
});
```


#### allSettled(concurrencyLimit?: number)

Same as JS [Promise.allSettled()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled), it returns the batch with all rejected and fulfilled promises. This is ideal for providing seamless user experiences.

##### Important note:

> This operation finishes all promises automatically (see [finishPromise](#finishpromisetnameorcustompromise-string--icustompromiset)), so if you need to handle each custom promise response individually, you MUST use [doneCallback](#donecallbackresponse-t-t) or [catchCallback](#catchcallbackerror-any-any).

##### Example:
```typescript
const concurrencyLimit = 2; // Executes at maximum 2 promises at a time
promiseBatch.allSettled(concurrencyLimit).then((response)=>{
  // response = { HelloPromise: "Hello World!', GoodbyePromise: "Goodbye World!", RejectPromise: "This is an error" }
  // You can access the status of each custom promise at any time, and, as you can see, the rejected custom promise keeps its status
  promiseBatch.observeStatus('RejectPromise');
  // {
  //    promiseStatus: PromiseStatus.Rejected,
  //    afterProcessingStatus: PromiseStatus.Fulfilled
  // }
}, (error)=>{
  // This is never executed. If you see an error here, it means this library is not working as intended
});
```


#### retryRejected(concurrencyLimit?: number)

Calls all previously rejected promises, that may have appeared after calling [exec](#exectnameorcustompromise-string--icustompromiset), [all](#allconcurrencyLimit-number) or [allSettled](#allsettledconcurrencyLimit-number). This is ideal for automatic error recovery.

##### Important note:

> This operation finishes all promises automatically (see [finishPromise](#finishpromisetnameorcustompromise-string--icustompromiset)), so if you need to handle each custom promise response individually, you MUST use [doneCallback](#donecallbackresponse-t-t) or [catchCallback](#catchcallbackerror-any-any).

##### Example:
```typescript
const concurrencyLimit = 2; // Executes at maximum 2 promises at a time
promiseBatch.all().catch((error)=>{
  // Some custom promise was rejected: RejectPromise

  // Maybe it was due to a data issue or a network issue, so, we can try to fix the issue and try again
  customPromiseList[0].args = ["Now it's ok"];

  promiseBatch.retryRejected(concurrencyLimit).then(...) // Same as all
});
```


#### exec\<T\>(nameOrCustomPromise: string | ICustomPromise\<T\>)

Executes a single custom promise given a custom promise or the name of a custom promise inside the batch. Behaves exactly as [all](#allconcurrencyLimit-number), [allSettled](#allsettledconcurrencyLimit-number) and [retryRejected](#retryrejectedconcurrencyLimit-number), saving the custom promise and its result to the associated batch.

##### Important note:
> For a single execution to be considered finished, you MUST define a callback for the case you are contemplating: Fullfillment or Rejection.
>
> There are two ways of doing that:
> * Define [doneCallback](#donecallbackresponse-t-t) or [catchCallback](#catchcallbackerror-any-any) properties in the [ICustomPromise\<T\>](#icustompromiset) object.
> * Implement exec's `.then` or `.catch` method with a call to [finishPromise](#finishpromisetnameorcustompromise-string--icustompromiset) at the end.
>
> Remember that if you only cover fullfillment case (`.doneCallback` or `.then`), on rejection, the custom promise won't be considered finished and viceversa.

##### TL;DR
> If you plan to execute a batch of Promises one by one, read the above note.

##### Example:
```typescript
const helloPromise: ICustomPromise<string> = {
    name: 'HelloPromise',
    function: () => Promise.resolve('Hello World!')
  };
const goodbyePromise: ICustomPromise<string> = {
    name: 'GoodbyePromise',
    function: () => Promise.reject('Goodbye World!'),
    catchCallback: (response: string) => 'ERROR: ' + response,
  };
promiseBatch.add(goodbyePromise);
promiseBatch.exec(helloPromise).then((result)=>{
  // result = 'Hello World!'

  // To finish the custom promise, call finishPromise here.
  promiseBatch.finishPromise('HelloPromise');
}, (error)=>{
  // Nothing
});

promiseBatch.exec('GoodbyePromise').then((result)=>{
  // Nothing
}, (error)=>{
  // This custom promise is considered finished since it has a catchCallback defined
  // which has already been executed

  // error = 'ERROR: Goodbye World!'
});
```


#### getCacheList()

Returns an object containing the execution result of each custom promise with `cached = true`.  It is indexed by the property `name` of each custom promise.

##### Example:
```typescript
const uncachedPromise: ICustomPromise<string> = {
  name: 'HelloPromiseUncached',
  cached: false, // It's the same as not specifying it
  function: () => Promise.resolve('Hello World from the preset!')
};
const cachedPromise: ICustomPromise<string> = {
  name: 'HelloPromiseCached',
  cached: true,
  function: () => Promise.resolve('Hello World from the past!')
};
promiseBatch.add(uncachedPromise);
promiseBatch.add(cachedPromise);
await promiseBatch.all(); // { HelloPromiseUncached: 'Hello World from the preset!', HelloPromiseCached: 'Hello World from the past!' }
promiseBatch.getCacheList(); // { HelloPromiseCached: 'Hello World from the past!' }
```


#### getBatchResponse()

Returns an object containing the response of previous executions of custom promises inside the batch. This is the same object returned as fulfillment result of [all](#allconcurrencyLimit-number), [allSettled](#allSettledconcurrencyLimit-number) and [retryRejected](#retryrejectedconcurrencyLimit-number).

##### Example:
```typescript
const anotherPromise: ICustomPromise<string>= {
  name: 'AnotherPromise',
  function: () => Promise.resolve('Another')
}
await promiseBatch.all(); // { HelloPromise: 'Hello World!', GoodbyePromise: 'Goodbye World!' }
promiseBatch.exec(anotherPromise); // { AnotherPromise: 'Another' }
promiseBatch.getBatchResponse() // { HelloPromise: 'Hello World!', GoodbyePromise: 'Goodbye World!',  AnotherPromise: 'Another' }
```


#### isBatchCompleted()

Returns true once all the custom promises in the batch have been fulfilled or rejected and marked as finished (see [finishPromise](#finishpromisetnameorcustompromise-string--icustompromiset)).

##### Important note:
> If some custom promise was not resolved (fulfilled or rejected) or some custom promise was not marked as finished, this function will wait indefinitely

##### Example:
```typescript
promiseBatch.all(); // Executing...
promiseBatch.isBatchCompleted().then((response)=>{
  // Once the set of promises has been completed, i.e, it is fulfilled or rejected...
  // response = true
});
```


#### isBatchFulfilled()

Awaits for the batch to be completed (see [isBatchCompleted](#isbatchcompleted)) and then returns true if all custom promises in the batch were fulfilled and false if some were rejected.


##### Example:
```typescript
promiseBatch.all(); // Executing...
promiseBatch.isBatchCompleted().then((response)=>{
  // Once the set of promises has been completed, i.e, it is fulfilled or rejected...
  // response = true
});
promiseBatch.isBatchFulfilled().then((response)=>{
  // If all are fulfilled, true, else, false. isBatchCompleted has to be true to return anything.
  // response = true
});
```


#### finishPromise\<T\>(nameOrCustomPromise: string | ICustomPromise\<T\>)

Marks the "after processing" status of a given a custom promise or the name of a custom promise inside the batch as fulfilled. This affects [exec](#exectnameorcustompromise-string--icustompromiset) calls whose customPromise does not define a [doneCallback](#donecallbackresponse-t-t) or [catchCallback](#catchcallbackerror-any-any) properties.
This is designed for making sure you can do all post-processing after the custom promise is resolved (fulfilled or rejected) without running into race conditions.

##### Example:
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
  // Do some data processing...
  promiseBatch.finishPromise('HelloPromise');
}, (error)=>{
  // Nothing
});

promiseBatch.exec('GoodbyePromise').then((result)=>{
  // Nothing
}, (error)=>{
  // error = 'Goodbye World!'
  // Do some data processing...
  promiseBatch.finishPromise(goodbyePromise);
});

promiseBatch.isBatchCompleted().then((result)=>{
    // result=true once promiseBatch.finishPromise is executed for both custom promises
});
```


#### finishAllPromises()

Marks all promises in the batch as finished (see [finishPromise](#finishpromisetnameorcustompromise-string--icustompromiset))

##### Example:
```typescript
const helloPromise = {
    name: 'HelloPromise',
    function: () => Promise.resolve('Hello World!')
  };
const goodbyePromise = {
    name: 'GoodbyePromise',
    function: () => Promise.resolve('Goodbye World!')
  };
promiseBatch.add(goodbyePromise);
await promiseBatch.exec(helloPromise); // result = 'Hello World!'
await promiseBatch.exec('GoodbyePromise'); // result = 'Goodbye World!'

promiseBatch.isBatchCompleted().then((result)=>{
  // result=true once promiseBatch.finishAllPromises is executed
});
promiseBatch.finishAllPromises();
```


#### observeStatus(nameOrCustomPromise: string | ICustomPromise\<unknown\>)

Returns the current execution status and "after processing" status (see [finishPromise](#finishpromisetnameorcustompromise-string--icustompromiset)) of a custom promise given a custom promise or the name of a custom promise inside the batch.

##### Example:
```typescript
promiseBatch.all().then((response)=>{
  promiseBatch.observeStatus('HelloPromise');
  // {
  //    promiseStatus: PromiseStatus.Fulfilled,
  //    afterProcessingStatus: PromiseStatus.Pending
  // }
  promiseBatch.finishPromise();
  promiseBatch.observeStatus('HelloPromise');
  // {
  //    promiseStatus: PromiseStatus.Fulfilled,
  //    afterProcessingStatus: PromiseStatus.Fulfilled
  // }
});
promiseBatch.observeStatus('HelloPromise');
// {
//    promiseStatus: PromiseStatus.Pending,
//    afterProcessingStatus: PromiseStatus.Pending
// }
```


#### getStatusList()

Returns an object with the promise and "after processing" status of all custom promises in the batch at that given point in time.

##### Example:
```typescript
const statusList = promiseBatch.getStatusList(); // statusList = { HelloPromise: { promiseStatus: PromiseStatus.Fulfilled, afterProcessingStatus: PromiseStatus.Pending }, ... }
```


#### resetPromise\<T\>(nameOrCustomPromise: string | ICustomPromise\<T\>)

Resets the status of a custom promise given a custom promise or the name of a custom promise inside the batch. This means it will behave like it was never called and all caching would be reset in the next execution.

##### Example:
```typescript
const helloPromise = {
    name: 'HelloPromise',
    function: () => Promise.resolve('Hello World!')
};

promiseBatch.add(goodbyePromise);
await promiseBatch.exec(helloPromise); // result = 'Hello World!'
promiseBatch.finishPromise(helloPromise);
promiseBatch.observeStatus('HelloPromise') // { promiseStatus: PromiseStatus.Fulfilled, afterProcessingStatus: PromiseStatus.Fulfilled }
promiseBatch.resetPromise('HelloPromise');
promiseBatch.observeStatus('HelloPromise') // { promiseStatus: PromiseStatus.Pending, afterProcessingStatus: PromiseStatus.Pending }
```


#### reset()

Resets the whole batch including all statuses and all execution results. It is like creating a new PromiseBatch with the same list of custom promises.

##### Example:
```typescript
// Imagine we are making an HTTP request to a REST API and the response changes each time...

const concurrencyLimit = 2; // Executes at maximum 2 promises at a time
await promiseBatch.all(concurrencyLimit); // response = { HelloPromise: "Hello World!', GoodbyePromise: "Goodbye World!" }
// The same
await promiseBatch.all(concurrencyLimit); // response = { HelloPromise: "Hello World!', GoodbyePromise: "Goodbye World!" }

promiseBatch.reset();

// Now it is different. The custom promise function has been called
await promiseBatch.all(concurrencyLimit); // response = { HelloPromise: "Hola Mundo!', GoodbyePromise: "Au revoir le monde!" }

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
There is no plan regarding contributions in this project.
## Credits
This NPM package has been developed by:

**Rafael Pernil Bronchalo** - *Developer*

* [github/rafaelpernil2](https://github.com/rafaelpernil2)

## License
This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
