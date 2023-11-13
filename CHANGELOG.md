# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [StatefulPromises]

## [3.3.6] - 2023-11-13
### Fixed
- Upgraded @babel/traversefrom 7.11.5 to 7.23.2 to solve a vulnerability

## [3.3.5] - 2023-07-21
### Fixed
- Upgraded word-wrap from 1.2.3 to 1.2.4 to solve a vulnerability
- Upgraded semver to solve a vulnerability

## [3.3.4] - 2023-01-06
### Fixed
- Upgraded json5 from 2.1.3 to 2.2.3 to solve a vulnerability

## [3.3.3] - 2022-11-22
### Changed
- Removed BetterCodeHub due to closing at December 31st 2022
- Removed "npx force-resolutions" preinstall script, it is no longer needed
### Fixed
- Upgraded minimatch from 3.0.4 to 3.1.2 to solve a vulnerability
- Downgrade eslint to correct major version (6.X.X instead of 7.X.X). Bug introduced in release [3.2.13]

## [3.3.2] - 2022-03-29
### Fixed
- Installation issue with force-resolutions

## [3.3.1] - 2022-03-25
### Fixed
- Upgraded minimist from 1.2.5 to 1.2.6 to solve a vulnerability

## [3.3.0] - 2022-02-12
### Changed
- Removed Knockout dependency, now it has ZERO DEPENDENCIES :)
- Bundle size is reduced by +80%!

## [3.2.13] - 2022-02-12
### Fixed
- Upgraded ansi-regex from 5.0.0 to 5.0.1 to solve a vulnerability

## [3.2.12] - 2022-02-12
### Fixed
- Upgraded ajv from 6.12.0 to 6.12.6 to solve a vulnerability

## [3.2.11] - 2022-02-12
### Fixed
- Upgraded pathval from 1.1.0 to 1.1.1 to solve a vulnerability

## [3.2.10] - 2021-08-12
### Fixed
- Improved GitHub Actions pipelines

## [3.2.9] - 2021-08-12
### Fixed
- Upgraded path-parse from 1.0.6 to 1.0.7 to solve a vulnerability

## [3.2.8] - 2021-06-11
### Fixed
- Upgraded glob-parent from 5.1.1 to 5.1.2 to solve a vulnerability

## [3.2.7] - 2021-05-11
### Fixed
- Upgraded lodash from 4.17.19 to 4.17.21 to solve a vulnerability

## [3.2.6] - 2021-04-01
### Fixed
- Added missing comparation links to new versions in CHANGELOG.md

## [3.2.5] - 2021-04-01
### Fixed
- Added missing update details to CHANGELOG.md

## [3.2.4] - 2021-04-01
### Fixed
- Upgraded y18n from 4.0.0 to 4.0.1 to solve a vulnerability

## [3.2.3] - 2020-10-18
### Added
- Changelog section in README

## [3.2.2] - 2020-10-18
### Added
- Tests for checking expected concurrencyLimit execution time
- Changelog

### Changed
- Updated README.md

### Fixed
- Fixed Github Actions pipelines "setup-node" step

## [3.2.1] - 2020-09-15
### Changed
- Improved code quality for BetterCodeHub badge

## [3.2.0] - 2020-09-15
### Added
- Code coverage tests
- Coveralls badge
- GitHub actions pull request checks for code coverage
- Github actions checks after pull request for code coverage and Coveralls status refresh

## [3.1.1] - 2020-08-31
### Fixed
- ConcurrencyLimit bug as reported in ParallelPromises (see [concurrency issue](https://github.com/rafaelpernil2/ParallelPromises/issues/13))

## [3.1.0] - 2020-08-25
### Added
- Uninitialized promise status
- Tests for cache behaviour

### Changed
- Improved status management
- Improved cache mechanism to avoid repeated calls to function

### Fixed
- Non-cached behaviour after repeated calls

## [3.0.1] - 2020-08-25
### Changed
- Simplified getCacheList() method

## [3.0.0] - 2020-08-25
### Changed
- Major refactor, all data is stored using a Map instead of several objects
- getStatusList() behaves differently now. It returns the current statuses insead of observables
- Improved documentation on README

### Removed
- Unused code

## [2.3.0] - 2020-08-16
### Added
- getCacheList() operation and its respective documentation and tests
- getBatchResponse() operation and its respective documentation and tests

### Changed
- Improved security by making each class property private
- Improved documentation on README

## [2.2.0] - 2020-08-14
### Added
- Missing test for exec() on rejection
- getBatchResponse() operation and its respective documentation and tests

### Fixed
- Rollback removal of notifyAsFinished()

### Removed
- Unused code

## [2.1.9] - 2020-08-14
### Changed
- Refactored code to use Guard Clauses

### Fixed
- Error messages

## [2.1.8] - 2020-08-14
### Changed
- Refactored resetPromise() and remove()

## [2.1.7] - 2020-08-14
### Changed
- Improved code legibility

## [2.1.6] - 2020-08-10
### Changed
- Naming refactors

## [2.1.5] - 2020-08-10
### Changed
- Simplified isPromiseCompleted

## [2.1.4] - 2020-08-08
### Changed
- Tweaked .bettercodehub.yml settings

### Fixed
- Reverted previous commit reducing public code

## [2.1.3] - 2020-08-08
### Changed
- Reduced public code (as an attempt to get 10/10 on BetterCodeHub)

### Fixed
- Reverted previous commit reducing interface code

## [2.1.2] - 2020-08-08
### Changed
- Reduced interface code (as an attempt to get 10/10 on BetterCodeHub)

### Fixed
- Reverted previous commit reducing interface code

## [2.1.1] - 2020-08-08
### Changed
- Tweaked .bettercodehub.yml settings

## [2.1.0] - 2020-08-08
### Changed
- Improved code quality and reduced bloat

## [2.0.1] - 2020-08-08
### Fixed
- A test and GitHub action pipelines

## [2.0.0] - 2020-08-08
### Added
- JSDocs to public code

### Changed
- Major refactor of code into one file
- Renamed folders
- Improved and simplified tests
- Changed .promiseAll to .all to comply with JS Promise methods naming
- Changed .promiseAny to .allSettled to comply with JS Promise methods naming
- Updated documentation

### Fixed
- Fixed a test and GitHub action pipelines

## [1.0.3] - 2020-07-20
### Fixed
- Lodash vulnerability

## [1.0.2] - 2020-05-09
### Changed
- Simplified GitHub Actions pipeline

## [1.0.1] - 2020-05-09
### Fixed
- GitHub Actions pipeline NPM publishing

## [1.0.0] - 2020-05-09
### Added
- Interface key validation in several places

### Changed
- Clarified documentation
- Updated devDependencies packages

### Fixed
- GitHub Actions pipeline NPM publishing
- finishPromise() bug: Now it avoids finishing custom promises with doneCallback or catchCallback

## [0.2.3] - 2020-03-24
### Fixed
- Updated package.json/package-lock.json version, which I forgot on the previous version

## 0.2.2* - 2020-03-24
### Fixed
- Tag publishing in GitHub Actions pipeline

## [0.2.1] - 2020-03-24
### Changed
- Minor naming changes in GitHub Actions pipelines

### Removed
- tsling.json

## [0.2.0] - 2020-03-24
### Changed
- Migrated from TSLint to ESLint
- Improved code quality by refactoring following ESLint rules
- Minor naming changes in GitHub Actions pipelines

### Removed
- tslint.json

## 0.1.3* - 2020-03-24
### Fixed
- NPM devDependencies vulnerabilities

## [0.1.2] - 2020-02-08
### Changed
- Improved documentation on README

### Fixed
- Bug with notifyAsFinished condition

## [0.1.1] - 2020-02-08
### Fixed
- Typo in documentation

## [0.1.0] - 2020-02-08
### Added
- finallyCallback() method to ICustomPromise, tests and documentation

## [0.0.7] - 2020-01-20
### Changed
- Improved documentation on README

## [0.0.6] - 2020-01-20
### Changed
- Improved documentation on README

## [0.0.5] - 2020-01-13
### Changed
- Improved documentation on README

## [0.0.4] - 2020-01-10
### Changed
- Fixed Table of Contents of README

## [0.0.3] - 2020-01-10
### Changed
- Improved documentation on README

## [0.0.2] - 2020-01-10
### Changed
- Moved src/utils/promise-batch-status.ts to src/promise-batch-status.ts

## 0.0.1* - 2020-01-10
### Added
- Initial version


*versions with no link have no associated tag on GitHub


[StatefulPromises]: https://github.com/rafaelpernil2/StatefulPromises
[3.3.6]: https://github.com/rafaelpernil2/StatefulPromises/compare/v3.3.5...v3.3.6
[3.3.5]: https://github.com/rafaelpernil2/StatefulPromises/compare/v3.3.4...v3.3.5
[3.3.4]: https://github.com/rafaelpernil2/StatefulPromises/compare/v3.3.3...v3.3.4
[3.3.3]: https://github.com/rafaelpernil2/StatefulPromises/compare/v3.3.2...v3.3.3
[3.3.2]: https://github.com/rafaelpernil2/StatefulPromises/compare/v3.3.1...v3.3.2
[3.3.1]: https://github.com/rafaelpernil2/StatefulPromises/compare/v3.3.0...v3.3.1
[3.3.0]: https://github.com/rafaelpernil2/StatefulPromises/compare/v3.2.13...v3.3.0
[3.2.13]: https://github.com/rafaelpernil2/StatefulPromises/compare/v3.2.12...v3.2.13
[3.2.12]: https://github.com/rafaelpernil2/StatefulPromises/compare/v3.2.11...v3.2.12
[3.2.11]: https://github.com/rafaelpernil2/StatefulPromises/compare/v3.2.10...v3.2.11
[3.2.10]: https://github.com/rafaelpernil2/StatefulPromises/compare/v3.2.9...v3.2.10
[3.2.9]: https://github.com/rafaelpernil2/StatefulPromises/compare/v3.2.8...v3.2.9
[3.2.8]: https://github.com/rafaelpernil2/StatefulPromises/compare/v3.2.7...v3.2.8
[3.2.7]: https://github.com/rafaelpernil2/StatefulPromises/compare/v3.2.6...v3.2.7
[3.2.6]: https://github.com/rafaelpernil2/StatefulPromises/compare/v3.2.5...v3.2.6
[3.2.5]: https://github.com/rafaelpernil2/StatefulPromises/compare/v3.2.4...v3.2.5
[3.2.4]: https://github.com/rafaelpernil2/StatefulPromises/compare/v3.2.3...v3.2.4
[3.2.3]: https://github.com/rafaelpernil2/StatefulPromises/compare/v3.2.2...v3.2.3
[3.2.2]: https://github.com/rafaelpernil2/StatefulPromises/compare/v3.2.1...v3.2.2
[3.2.1]: https://github.com/rafaelpernil2/StatefulPromises/compare/v3.2.0...v3.2.1
[3.2.0]: https://github.com/rafaelpernil2/StatefulPromises/compare/v3.1.1...v3.2.0
[3.1.1]: https://github.com/rafaelpernil2/StatefulPromises/compare/v3.1.0...v3.1.1
[3.1.0]: https://github.com/rafaelpernil2/StatefulPromises/compare/v3.0.1...v3.1.0
[3.0.1]: https://github.com/rafaelpernil2/StatefulPromises/compare/v3.0.0...v3.0.1
[3.0.0]: https://github.com/rafaelpernil2/StatefulPromises/compare/v2.3.0...v3.0.0
[2.3.0]: https://github.com/rafaelpernil2/StatefulPromises/compare/v2.2.0...v2.3.0
[2.2.0]: https://github.com/rafaelpernil2/StatefulPromises/compare/v2.1.9...v2.2.0
[2.1.9]: https://github.com/rafaelpernil2/StatefulPromises/compare/v2.1.8...v2.1.9
[2.1.8]: https://github.com/rafaelpernil2/StatefulPromises/compare/v2.1.7...v2.1.8
[2.1.7]: https://github.com/rafaelpernil2/StatefulPromises/compare/v2.1.6...v2.1.7
[2.1.6]: https://github.com/rafaelpernil2/StatefulPromises/compare/v2.1.5...v2.1.6
[2.1.5]: https://github.com/rafaelpernil2/StatefulPromises/compare/v2.1.4...v2.1.5
[2.1.4]: https://github.com/rafaelpernil2/StatefulPromises/compare/v2.1.3...v2.1.4
[2.1.3]: https://github.com/rafaelpernil2/StatefulPromises/compare/v2.1.2...v2.1.3
[2.1.2]: https://github.com/rafaelpernil2/StatefulPromises/compare/v2.1.1...v2.1.2
[2.1.1]: https://github.com/rafaelpernil2/StatefulPromises/compare/v2.1.0...v2.1.1
[2.1.0]: https://github.com/rafaelpernil2/StatefulPromises/compare/v2.0.1...v2.1.0
[2.0.1]: https://github.com/rafaelpernil2/StatefulPromises/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/rafaelpernil2/StatefulPromises/compare/v1.0.3...v2.0.0
[1.0.3]: https://github.com/rafaelpernil2/StatefulPromises/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/rafaelpernil2/StatefulPromises/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/rafaelpernil2/StatefulPromises/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/rafaelpernil2/StatefulPromises/compare/v0.2.3...v1.0.0
[0.2.3]: https://github.com/rafaelpernil2/StatefulPromises/compare/v0.2.1...v0.2.3
[0.2.1]: https://github.com/rafaelpernil2/StatefulPromises/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/rafaelpernil2/StatefulPromises/compare/v0.1.2...v0.2.0
[0.1.2]: https://github.com/rafaelpernil2/StatefulPromises/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/rafaelpernil2/StatefulPromises/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/rafaelpernil2/StatefulPromises/compare/v0.0.7...v0.1.0
[0.0.7]: https://github.com/rafaelpernil2/StatefulPromises/compare/v0.0.6...v0.0.7
[0.0.6]: https://github.com/rafaelpernil2/StatefulPromises/compare/v0.0.5...v0.0.6
[0.0.5]: https://github.com/rafaelpernil2/StatefulPromises/compare/v0.0.4...v0.0.5
[0.0.4]: https://github.com/rafaelpernil2/StatefulPromises/compare/v0.0.3...v0.0.4
[0.0.3]: https://github.com/rafaelpernil2/StatefulPromises/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/rafaelpernil2/StatefulPromises/compare/250c9897e4453954df10ec76372b8483924f6356...v0.0.2