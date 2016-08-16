import fs from 'fs'
import { test, exec, which } from 'shelljs'

export function parse(obj) {
  if ('string' !== typeof obj) {
    return Object.keys(obj).reduce((o, k) => {
      o[k] = parse(obj[k])
      return o
    }, {})
  }
  let parts = obj.replace(/.*?:\/\//g, '').split(':')
  return {
    host: parts[0],
    port: parseInt(parts[1], 10)
  }
}

export function format(obj) {
  return Object.keys(obj).reduce((o, k) => {
    o[k] = `${obj[k].host}:${obj[k].port}`
    return o
  }, {})
}

export function set(string, key, value) {
  if ('object' === typeof key) {
    return Object.keys(key).reduce((s, k) =>
    set(s, k, key[k]), string)
  }
  let v = get(string, key)
  key = `dbms\.connector\.${key}\.address`
  let regex = new RegExp(`^#?[ \t]?${key}=${v}`, 'gm')
  return string.replace(regex, `${key}=${value}`)
}

export function get(string, key) {
  if (!key) {
    return {
      bolt: get(string, 'bolt'),
      http: get(string, 'http'),
      https: get(string, 'https')
    }
  }
  key = `dbms\.connector\.${key}\.address`
  let regex = new RegExp(`${key}=(.*)`, 'gm')
  let res = string.match(regex)
  if (!res || !res.length) return null
  return res[0].replace(`${key}=`, '')
}

export function fetch(host, file, path) {
  if (test('-e', `${path}/neo4j/${file}`)) return
  if (which('wget'))
    exec(`wget ${host}/${file} -O ${path}/neo4j/${file}`)
  else if (which('curl'))
    exec(`curl ${host}/${file} -o ${path}/neo4j/${file}`)
  else
    throw new Error('`curl` or `wget` required');
}

export function dirs(path) {
  return fs.readdirSync(path)
    .filter(file => fs.statSync(`${path}/${file}`)
    .isDirectory())
}
