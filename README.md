# cloudformation-template-tagger
===

Automagically tag eligible CloudFormation ressources.

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/cloudformation-template-tagger.svg)](https://npmjs.org/package/cloudformation-template-tagger)
[![Downloads/week](https://img.shields.io/npm/dw/cloudformation-template-tagger.svg)](https://npmjs.org/package/cloudformation-template-tagger)
[![License](https://img.shields.io/npm/l/cloudformation-template-tagger.svg)](https://github.com/LukvonStrom/cloudformation-template-tagger/blob/master/package.json)

<!-- toc -->
* [cloudformation-template-tagger](#cloudformation-template-tagger)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g cloudformation-template-tagger
$ tagcf COMMAND
running command...
$ tagcf (-v|--version|version)
cloudformation-template-tagger/0.0.1 win32-x64 node-v12.16.1
$ tagcf --help [COMMAND]
USAGE
  $ tagcf COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->

<!-- commandsstop -->


## Known Gotchas:

The tool is only able to tag top-level Resources - nested ressources like `AWS::ApiGateway::Deployment StageDescription` are not tagged.
