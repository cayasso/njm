'use strict'

import fs from 'fs'
import rc from 'rc'
import { get, set, fetch, format, parse } from './utils'
import { test, mkdir, ls, rm, mv, exec } from 'shelljs'

const conf = rc('NJM', {
  PATH: `${__dirname}/../.njm`,
  NEO4J_RELEASE: '3.0.3',
  NEO4J_EDITION: 'community',
  NEO4J_HTTP: '0.0.0.0:7474',
  NEO4J_HOST: 'http://dist.neo4j.org'
})

export default (opt = {}) => {
  let instances = {}

  const {
    path = conf.PATH,
    http = conf.NEO4J_HTTP,
    release = conf.NEO4J_RELEASE,
    edition = conf.NEO4J_EDITION
  } = opt

  const makeDir = p => (test('-d', p) || mkdir(p))
  const batch = fn => Object.keys(instances).map(fn)
  const sourceFile = v => `neo4j-${edition}-${v}-unix.tar.gz`
  const dirs = ls('-d', `${path}/instances/*`).map(d => d.replace(`${path}/instances/`, ''))
  const command = cmd => name => {
    if (!name) return batch(command(cmd))
    instances[name] &&
    instances[name][cmd]()
    if ('destroy' === cmd) delete instances[name]
  }

  const stop = command('stop')
  const start = command('start')
  const restart = command('restart')
  const destroy = command('destroy')
  const instance = name => name ? instances[name] : instances
  const create = (name, options) => {
    if (instances[name]) instances[name].destroy()
    const file = sourceFile(options && options.release || release)
    const instancePath = `${path}/instances/${name}`
    const tempPath = `${path}/temp/${name}`
    fetch(conf.NEO4J_HOST, file, path)
    rm('-rf', instancePath)
    makeDir(tempPath)
    exec(`tar -xjf ${path}/neo4j/${file} -C ${tempPath}/`)
    mv('-f', `${tempPath}/${file}`.replace('-unix.tar.gz', ''), instancePath)
    rm('-rf', `${tempPath}/`)
    instances[name] = createInstance(name, instancePath, { http, ...options })
  }

  makeDir(path)
  makeDir(`${path}/temp/`)
  makeDir(`${path}/neo4j/`)
  makeDir(`${path}/instances/`)

  dirs.map(name => {
    const instancePath = `${path}/instances/${name}`
    const file = fs.readFileSync(`${instancePath}/conf/neo4j.conf`, 'utf8')
    if (instances[name]) return
    instances[name] = createInstance(name, instancePath, false)
  })

  return { create, start, stop, restart, destroy, instance }
}

function createInstance(name, path, options) {
  const command = cmd => () => {
    if (!test('-d', path)) throw new Error('Invalid instance')
    exec(`${path}/bin/neo4j ${cmd}`)
  }
  const start = command('start')
  const stop = command('stop')
  const restart = command('restart')
  const destroy = () => {
    if (test('-e', `${path}/run/neo4j.pid`)) stop()
    rm('-rf', path)
  }

  const setup = (props = {}) => {
    let file = fs.readFileSync(`${path}/conf/neo4j.conf`, 'utf8')
    let _props = parse(get(file))

    if (props) {
      if (props.http) {
        if (!isNaN(props.http)) {
          _props.http.port = parseInt(props.http)
        } else {
          _props.http = parse(props.http)
        }
      }

      if (props.https) {
        if (!isNaN(props.https)) {
          _props.https.port = parseInt(props.https)
        } else {
          _props.https = parse(props.https)
        }
      } else {
        _props.https.port = _props.http.port + 1
      }

      if (props.bolt) {
        if (!isNaN(props.bolt)) {
          _props.bolt.port = parseInt(props.bolt)
        } else {
          _props.bolt = parse(props.bolt)
        }
      } else {
        _props.bolt.port = _props.http.port - 1
      }
    }

    file = set(file, format(_props))
    exec(`rm -rf ${path}/conf/neo4j.conf`)
    fs.writeFileSync(`${path}/conf/neo4j.conf`, file)

    return { ...get(file), setup, start, stop, destroy, restart }
  }

  return setup(options)
}
