import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import path from 'node:path'

test('Deployment Configs — Dockerfile and Nginx configuration exist', () => {
  const dockerfilePath = path.resolve('Dockerfile')
  const nginxPath = path.resolve('nginx.conf')

  assert.ok(fs.existsSync(dockerfilePath), 'Dockerfile must exist')
  assert.ok(fs.existsSync(nginxPath), 'nginx.conf must exist')

  const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf-8')
  assert.ok(dockerfileContent.includes('node:22-alpine'))
  assert.ok(dockerfileContent.includes('nginx:alpine'))
})

test('Deployment Configs — Firebase Hosting JSON and App Hosting YAML exist and are valid', () => {
  const firebaseJsonPath = path.resolve('firebase.json')
  const appHostingPath = path.resolve('apphosting.yaml')

  assert.ok(fs.existsSync(firebaseJsonPath), 'firebase.json must exist')
  assert.ok(fs.existsSync(appHostingPath), 'apphosting.yaml must exist')

  const firebaseJson = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf-8'))
  assert.equal(firebaseJson.hosting.public, 'dist')
  assert.ok(firebaseJson.hosting.rewrites.length > 0)
})
