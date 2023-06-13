import { writeFile } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import globby from 'fast-glob'

import Lexer from './lexer.ts'
import parse from './parser.ts'
import functions from './functions/index.ts'
import { isFunction, toCamelCase } from './util.ts'
import { getText, isDoubleTag, isSingleTag, optRenderOnce, optShouldConsume, unParse } from './tags.ts'

async function flattenSingleTag(tag, data, allFunctions, config) {
  /**
   * Convert a single tag into raw text,
   * by evaluating the tag function.
   */
  const func = allFunctions[toCamelCase(tag.name)]
  if (!isFunction(func)) {
    console.warn(`Unknown single tag "${tag.name}"!`)
    return
  }
  // Params for the tag come from custom data, parsed params and config
  let params = { ...data, ...tag.params }
  if (config.tags && typeof config.tags[tag.name] === 'object') {
    params = { ...config.tags[tag.name], ...params }
  }
  // Text inside the single tag?
  const text = params.text ? params.text : ''
  let result = tag.rawText
  try {
    // Execute the tag function with params
    result = await func({ text }, params, { single: true })
    delete tag.name
    delete tag.single
    tag.rawText = result.toString()
  } catch (err) {
    console.warn(`Cannot eval single tag "${tag.name}":`, err.message)
  }
}

async function flattenDoubleTag(tag, data, allFunctions, config) {
  /*
   * Deep evaluate all tags, by calling the tag function.
   * If the double tag has param consume=true, it will be destroyed
   * after render, just like a single tag.
   * If the double tag has param once=true, it will not be evaluated,
   * if it contains any text inside.
   */
  if (tag.children) {
    for (const c of tag.children) {
      if (isDoubleTag(c)) {
        await flattenDoubleTag(c, data, allFunctions, config)
      } else if (isSingleTag(c)) {
        await flattenSingleTag(c, data, allFunctions, config)
      }
    }
  }
  // At this point all children are flat
  const func = allFunctions[toCamelCase(tag.name)]
  if (!isFunction(func)) {
    console.warn(`Unknown double tag "${tag.name}"!`)
    return
  }
  // Params for the tag come from custom data, parsed params and config
  let params = { ...data, ...tag.params }
  if (config.tags && typeof config.tags[tag.name] === 'object') {
    params = { ...config.tags[tag.name], ...params }
  }
  const text = getText(tag)
  if (text && optRenderOnce(tag)) {
    return
  }
  let result = text
  try {
    // Execute the tag function with params
    result = await func({ text }, params, { double: true })
    if (optShouldConsume(tag)) {
      delete tag.name
      delete tag.double
      delete tag.params
      delete tag.children
      delete tag.firstTagText
      delete tag.secondTagText
      tag.rawText = result.toString()
    } else {
      tag.children = [{ rawText: result.toString() }]
    }
  } catch (err) {
    console.warn(`Cannot eval double tag "${tag.name}":`, err.message)
  }
}

export async function renderText(text, data = {}, customFunctions = {}, customConfig = {}): string {
  /**
   * TwoFold render text string.
   */
  const allFunctions = { ...functions, ...customFunctions }
  // const label = 'tf-' + (Math.random() * 100 * Math.random()).toFixed(6)
  // console.time(label)
  const ast = parse(new Lexer(customConfig).lex(text), customConfig)

  let final = ''
  // Convert single tags into raw text and deep flatten double tags
  for (const t of ast) {
    if (isDoubleTag(t)) {
      await flattenDoubleTag(t, data, allFunctions, customConfig)
    } else if (isSingleTag(t)) {
      await flattenSingleTag(t, data, allFunctions, customConfig)
    }
    final += unParse(t)
  }

  // console.timeEnd(label)
  return final
}

export async function renderStream(stream, data = {}, customFunctions = {}, customConfig = {}): Promise<string> {
  /**
   * TwoFold render stream.
   */
  const allFunctions = { ...functions, ...customFunctions }

  return new Promise(resolve => {
    // const label = 'tf-' + (Math.random() * 100 * Math.random()).toFixed(6)
    // console.time(label)
    const lex = new Lexer(customConfig)

    stream.on('data', text => {
      lex.push(text)
    })

    stream.on('close', async () => {
      console.log('close!')
      const ast = parse(lex.finish(), customConfig)
      let final = ''

      // Convert single tags into raw text and deep flatten double tags
      for (const t of ast) {
        if (isDoubleTag(t)) {
          await flattenDoubleTag(t, data, allFunctions, customConfig)
        } else if (isSingleTag(t)) {
          await flattenSingleTag(t, data, allFunctions, customConfig)
        }
        final += unParse(t)
      }

      // console.timeEnd(label)
      resolve(final)
    })
  })
}

export async function renderFile(fname: string, data = {}, customFunctions = {}, config = {}): string {
  const stream = createReadStream(fname, { encoding: 'utf8' })
  const result = await renderStream(stream, data, customFunctions, config)
  if (config.write) {
    await writeFile(fname, result, { encoding: 'utf8' })
    return ''
  }
  return result
}

export async function renderFolder(dir: string, data = {}, customFunctions = {}, config = {}): number {
  if (!data) {
    data = {}
  }
  if (!config) {
    config = {}
  }
  if (!customFunctions) {
    customFunctions = {}
  }
  const glob = config.glob || ['*.*']
  const depth = config.depth || 3

  let index = 0
  const files = await globby(glob, { cwd: dir, deep: depth, baseNameMatch: true, onlyFiles: true })
  for (const pth of files) {
    const fname = `${dir}/${pth}`
    await renderFile(fname, data, customFunctions, config)
    index++
  }
  return index
}

export default { renderText, renderStream, renderFile, renderFolder }
