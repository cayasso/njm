'use strict'

import fs from 'fs'
import rc from 'rc'
import { pwd, test, mkdir, ls, rm, mv, exec, which } from 'shelljs'

const conf = rc('NJM', {
  PATH: pwd() + '/.njm',
  NEO4J_VERSION: '3.0.3',
  NEO4J_EDITION: 'community',
  NEO4J_HOST: 'http://dist.neo4j.org',
  NEO4J_BOLT_ADDRESS: '0.0.0.0:7687',
  NEO4J_HTTP_ADDRESS: '0.0.0.0:7474',
  NEO4J_HTTPS_ADDRESS: 'localhost:7473'
})

export default (options = {}) => {
  let instances = {}

  const {
    path = conf.PATH,
    version = conf.NEO4J_VERSION,
    edition = conf.NEO4J_EDITION,
    bolt = conf.NEO4J_BOLT_ADDRESS,
    http = conf.NEO4J_HTTP_ADDRESS,
    https = conf.NEO4J_HTTPS_ADDRESS
  } = options

  const makeDir = p => (test('-d', p) || mkdir(p))
  const batch = fn => Object.keys(instances).map(fn)
  const sourceFile = v => `neo4j-${edition}-${v}-unix.tar.gz`
  const dirs = ls('-d', `${path}/instances/*`).map(d => d.replace(`${path}/instances/`, ''))

  const command = cmd => name => {
    if (!name) return batch(command(cmd))
    instances[name] &&
    instances[name][cmd]()
    if ('destroy' === cmd)
    delete instances[name]
  }

  const stop = command('stop')
  const start = command('start')
  const restart = command('restart')
  const destroy = command('destroy')
  const instance = name => name ? instances[name] : instances

  const create = (name, ver = version) => {
    if (instances[name]) instances[name].destroy()

    const file = sourceFile(ver)
    const tempPath = `${path}/temp/${name}`
    const instancePath = `${path}/instances/${name}`

    fetch(file, path)
    rm('-rf', instancePath)
    makeDir(tempPath)
    exec(`tar -xjf ${path}/neo4j/${file} -C ${tempPath}/`)
    mv('-f', `${tempPath}/${file}`.replace('-unix.tar.gz', ''), instancePath)
    rm('-rf', `${tempPath}/`)

    instances[name] = createInstance(name, instancePath, { http })
  }

  makeDir(path)
  makeDir(`${path}/temp/`)
  makeDir(`${path}/neo4j/`)
  makeDir(`${path}/instances/`)

  dirs.map(name => {
    const instancePath = `${path}/instances/${name}`
    if (instances[name]) return
    instances[name] = createInstance(name, instancePath, { http })
  })

  return { create, start, stop, restart, destroy, instance }
}

function createInstance(name, path, options = {}) {
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

  const property = (string, key, value) => {
    let prop = `dbms\.connector\.${key}\.address`
    return ('undefined' !== typeof value)
      ? set(string, prop, value)
      : get(string, prop)
  }

  const configure = (props = {}) => {
    let conf = fs.readFileSync(`${path}/conf/neo4j.conf`, 'utf8')

    if (props.http) {
      conf = property(conf, 'http', props.http)
      let parts = props.http.split(':')

      if (!props.https) {
        props.https = parts.map(v => isNaN(v) ? v : (v * 1) + 1).join(':')
      }

      if (!props.bolt) {
        props.bolt = parts.map(v => isNaN(v) ? v : (v * 1) + 2).join(':')
      }
    }

    if (props.https) {
      conf = property(conf, 'https', props.https)
    }

    if (props.bolt) {
      conf = property(conf, 'bolt', props.bolt)
    }

    exec(`rm -rf ${path}/conf/neo4j.conf`)
    fs.writeFileSync(`${path}/conf/neo4j.conf`, conf)

    return {
      bolt: property(conf, 'bolt'),
      http: property(conf, 'http'),
      https: property(conf, 'https'),
      configure,
      start,
      stop,
      destroy,
      restart
    }
  }

  return configure(options)
}

function set(string, key, value) {
  let v = get(string, key)
  let regex = new RegExp(`^#?[ \t]?${key}=${v}`, 'gm')
  return string.replace(regex, `${key}=${value}`)
}

function get(string, key) {
  let regex = new RegExp(`${key}=(.*)`, 'gm')
  let res = string.match(regex)
  if (!res || !res.length) return null
  return res[0].replace(`${key}=`, '')
}

function fetch(file, path) {
  if (test('-e', `${path}/neo4j/${file}`)) return
  if (which('wget'))
    exec(`wget ${conf.NEO4J_HOST}/${file} -O ${path}/neo4j/${file}`)
  else if (which('curl'))
    exec(`curl ${conf.NEO4J_HOST}/${file} -o ${path}/neo4j/${file}`)
  else
    throw new Error('`curl` or `wget` required');
}
