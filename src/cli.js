'use strict'

import pkg from '../package.json'
import cmd from 'commander'
import njm from './njm'

cmd
  .version(pkg.version)

cmd
  .command('create <name>')
  .description('create a new neo4j instance')
  .option("-e, --edition <edition>", "Set the neo4j edition")
  .option("-v, --version <version>", "Set the neo4j version")
  .option("-a, --address <address>", "Set the http address")
  .option("-s, --ssl <ssl>", "Set the https address")
  .option("-b, --bolt <bolt>", "Set bolt address")
  .action((name, options) => {
    if (options.address) options.http = options.address
    if (options.ssl) options.https = options.ssl
    let { http, https, bolt, edition, version } = options
    njm().create(name, { http, https, bolt, edition, version })
  })

cmd
  .command('stop [name]')
  .description('create a new neo4j instance')
  .action((name, options) => {
    njm().stop(name)
  })

cmd
  .command('start [name]')
  .description('create a new neo4j instance')
  .action((name, options) => {
    njm().start(name)
  })

cmd
  .command('stop [name]')
  .description('create a new neo4j instance')
  .action((name, options) => {
    njm().stop(name)
  })

cmd
  .command('restart [name]')
  .description('create a new neo4j instance')
  .action((name, options) => {
    njm().restart(name)
  })

cmd
  .command('destroy [name]')
  .description('create a new neo4j instance')
  .action((name, options) => {
    njm().destroy(name)
  })

cmd.parse(process.argv)
