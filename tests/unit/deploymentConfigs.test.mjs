import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import path from 'node:path'

test('Deployment Configs — Dockerfile and Nginx configuration exist and contain security headers', () => {
  const dockerfilePath = path.resolve('Dockerfile')
  const nginxPath = path.resolve('nginx.conf')

  assert.ok(fs.existsSync(dockerfilePath), 'Dockerfile must exist')
  assert.ok(fs.existsSync(nginxPath), 'nginx.conf must exist')

  const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf-8')
  assert.ok(dockerfileContent.includes('node:22-alpine'))
  assert.ok(dockerfileContent.includes('nginx:alpine'))

  const nginxContent = fs.readFileSync(nginxPath, 'utf-8')
  assert.ok(nginxContent.includes('Content-Security-Policy'))
  assert.ok(nginxContent.includes('Permissions-Policy'))
  assert.ok(nginxContent.includes('worker-src'))
})

test('Deployment Configs — Docker Compose V2 file is valid', () => {
  const composePath = path.resolve('docker-compose.yml')
  assert.ok(fs.existsSync(composePath), 'docker-compose.yml must exist')

  const composeContent = fs.readFileSync(composePath, 'utf-8')
  assert.ok(composeContent.includes('autoguard-app'))
  assert.ok(composeContent.includes('services:'))
  assert.ok(!composeContent.startsWith("version: '3.8'"), 'Must not have obsolete version string')
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
