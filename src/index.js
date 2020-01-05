#!/usr/bin/env node

const minimist = require('minimist')
const chalk = require('chalk')
const execa = require('execa')
const path = require('path')
const glob = require('glob')
;(async () => {
  const argv = minimist(process.argv.slice(2))
  const root = argv.root || 'packages'
  const args = argv._
  const command = args.shift()
  const shell = command => execa.command(command, { shell: '/bin/sh' })

  if (!['exec', 'publish'].includes(command)) {
    console.log(
      chalk.red('Unrecognised command, please run with publish or exec')
    )
    process.exit(0)
  }

  try {
    if (command === 'publish') {
      await shell('git diff-index --quiet HEAD --')
    }
  } catch (e) {
    console.log(
      chalk.red('Publish not allowed, because you have pending changes in git')
    )
    process.exit(0)
  }

  const packages = glob
    .sync(path.join(process.cwd(), root, '*', 'package.json'))
    .map(x => ({
      name: require(x).name,
      dependencies: Object.keys(require(x).dependencies || {}).concat(
        Object.keys(require(x).devDependencies || {})
      ),
      directory: path.dirname(x)
    }))
    .reverse()

  const packageNames = packages.map(x => x.name)

  for (const item of packages) {
    item.dependencies = item.dependencies.filter(x => packageNames.includes(x))
  }

  const order = []

  const dependencyCount = ({ dependencies }) =>
    dependencies.filter(x => !order.includes(x)).length

  const walk = item => {
    if (order.find(x => x.name === item.name)) return
    if (order.length === packageNames.length) return
    const pending = dependencyCount(item)
    if (pending) {
      for (const child of item.dependencies) {
        walk(packages.find(x => x.name === child))
      }
    }
    order.push(item)
  }

  for (const item of packages) walk(item)

  const run = command === 'exec' && args.shift()
  let version = command === 'publish' && args.shift()

  if (command === 'publish' && !version) {
    console.log(chalk.red('version patch or number expected'))
    process.exit(0)
  } else {
    console.log(chalk.green(`ᐅ publishing ${version}`))
  }

  const exec = async (run, args, { name, directory } = {}) => {
    const suffix = name
      ? `in directory ${chalk.magenta.bold(
          path.basename(directory)
        )} for package ${chalk.magenta.bold(name)}`
      : ''
    console.log(
      chalk.green(
        `${chalk.green.bold('ᐅ')} running ${run} ${chalk.yellow.bold(
          args.join(' ')
        )} ${suffix}`
      )
    )
    await execa(run, [...args, ...(directory ? ['--prefix', directory] : [])], {
      stdio: 'inherit'
    })
  }

  for (const item of order) {
    if (command === 'exec') {
      await exec(run, args, item)
    }
    if (command === 'publish') {
      for (const name of item.dependencies) {
        await exec('npm', ['install', `${name}@${version}`], {
          directory: item.directory
        })
      }
      await exec('npm', ['--no-git-tag-version', 'version', version], item)
      if (version === 'patch') {
        version = (await shell(
          `git diff ${
            item.directory
          }/package.json | grep -E '^\\+\\s*"version"' | cut -d '"' -f4`
        )).stdout
      }
      await exec('npm', ['publish', item.directory])
    }
  }

  if (command === 'publish') {
    const gitTag = 'v' + version

    await shell("git ls-files -m | grep 'package.*.json' | xargs git add")
    await shell(`git commit -m '${gitTag}'`)
    await shell(`git tag ${gitTag}`)

    console.log(chalk.green.bold(`published ${gitTag}`))
  }
})().catch(err => {
  console.error(chalk.red(err.stack))
  process.exit(1)
})
