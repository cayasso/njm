'use strict'

import pkg from '../package.json'
import cmd from 'commander'
import njm from './njm'

cmd
  .version(pkg.version)

cmd
  .command('create <name>')
  .description('create a new neo4j intance')
  .action((name, options) => {
    njm().create(name)
  })

cmd
  .command('start <name>')
  .description('create a new neo4j intance')
  .action((name, options) => {
    njm().start(name)
  })

cmd
  .command('stop <name>')
  .description('create a new neo4j intance')
  .action((name, options) => {
    njm().stop(name)
  })


cmd
  .command('restart <name>')
  .description('create a new neo4j intance')
  .action((name, options) => {
    njm().restart(name)
  })

cmd
  .command('destroy <name>')
  .alias('ex')
  .description('create a new neo4j intance')
  .action((name, options) => {
    njm().destroy(name)
  })

cmd.parse(process.argv)
